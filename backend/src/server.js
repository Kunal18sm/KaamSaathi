require('dotenv').config();

// Prevent server from crashing on unhandled errors
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const connectDB = require('./db/connect');
const store = require('./db/store');
const { findBestWorkerMatch, getHaversineDistance, calculateInviteFee } = require('./services/matchingEngine');
const { uploadImage } = require('./utils/cloudinary');
const {
  User: PersistentUser,
  Booking: PersistentBooking,
  WelfareTransaction: PersistentWelfareTransaction,
  Complaint: PersistentComplaint
} = require('./models/schemas');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'sahkaar_sevasetu_secret_key_2026';

// Keep browser access limited to explicitly configured frontend origins in
// deployed environments. Multiple origins can be comma-separated.
const allowedOrigins = new Set(
  (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)
);
app.use(cors({
  origin(origin, callback) {
    // Requests without Origin include Render's health check and server-to-server calls.
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Workers and customers are loaded exclusively from MongoDB.
// No fake/demo worker data is bundled in the in-memory store.
store.customers = [];

const isDatabaseConnected = () => mongoose.connection.readyState === 1;
const requireDatabase = () => {
  if (isDatabaseConnected()) return;
  const error = new Error('Database is unavailable. Check MONGODB_URI and MongoDB connectivity.');
  error.code = 'DATABASE_UNAVAILABLE';
  throw error;
};

// Persist the same objects the portals use. Keeping these helpers in one place
// prevents a route from updating only the temporary in-memory store.
const saveUser = async (user) => {
  requireDatabase();
  if (!user?.id) return;
  const { id, _id, ...fields } = user;
  await PersistentUser.updateOne({ userId: id }, { $set: { ...fields, userId: id } }, { upsert: true });
};
const saveBooking = async (booking) => {
  requireDatabase();
  if (!booking?.id) return;
  const { id, _id, ...fields } = booking;
  await PersistentBooking.updateOne({ bookingId: id }, { $set: { ...fields, bookingId: id } }, { upsert: true });
};
const saveWelfareTransaction = async (transaction) => {
  requireDatabase();
  if (!transaction?.id) return;
  const { id, _id, ...fields } = transaction;
  await PersistentWelfareTransaction.updateOne({ txId: id }, { $set: { ...fields, txId: id } }, { upsert: true });
};
const saveComplaint = async (complaint) => {
  requireDatabase();
  if (!complaint?.id) return;
  const { id, _id, ...fields } = complaint;
  await PersistentComplaint.updateOne({ complaintId: id }, { $set: { ...fields, complaintId: id } }, { upsert: true });
};

// Load all persisted portal data before accepting requests, so a booking cannot
// be matched against a partially loaded worker list after a server restart.
const loadPersistentData = (async () => {
  const connected = await connectDB();
  if (!connected) return;
  try {
    const [users, bookings, welfareTransactions, complaints] = await Promise.all([
      PersistentUser.find().lean(),
      PersistentBooking.find().lean(),
      PersistentWelfareTransaction.find().lean(),
      PersistentComplaint.find().lean()
    ]);
    users.forEach(doc => {
      const user = { ...doc, id: doc.userId, _id: undefined };
      if (user.role === 'WORKER') store.workers.push(user);
      if (user.role === 'CUSTOMER') store.customers.push(user);
    });
    store.bookings = bookings.map(({ _id, bookingId, ...booking }) => ({ ...booking, id: bookingId }));
    store.welfareTransactions = welfareTransactions.map(({ _id, txId, ...transaction }) => ({ ...transaction, id: txId }));
    store.complaints = complaints.map(({ _id, complaintId, ...complaint }) => ({ ...complaint, id: complaintId }));
    console.log(`Loaded ${store.workers.length} workers, ${store.customers.length} customers and ${store.bookings.length} bookings from MongoDB.`);
  } catch (err) {
    console.error('Could not load registered accounts from MongoDB:', err.message);
  }
})();

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Middleware for JWT verification
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Sahkaar / SevaSetu Backend is running smoothly', time: new Date() });
});

// ----------------------------------------------------
// AUTHENTICATION ROUTES (LOGIN & REGISTER)
// ----------------------------------------------------

// Store and compare Indian mobile numbers consistently. Registrations use a
// `+91` prefix while the login form accepts the usual 10-digit input.
const cleanPhone = (p) => {
  const digits = p ? String(p).replace(/[^\d]/g, '') : '';
  return digits.length > 10 ? digits.slice(-10) : digits;
};

// 1. User Register (Customer, Worker, Coop Admin)
app.post('/api/auth/register', async (req, res) => {
  const { 
    name, phone, email, password, role, coopId, skills, experienceYears, certificates, photo,
    latitude, longitude, address: userAddress
  } = req.body;

  if (!phone || !name || !role) {
    return res.status(400).json({ error: 'Name, phone, and role are required' });
  }

  const normalizedName = String(name).trim().replace(/\s+/g, ' ');
  const phoneDigits = cleanPhone(phone);
  const indianMobile = phoneDigits.length === 10 ? phoneDigits : phoneDigits.slice(-10);
  if (!/^[A-Za-z][A-Za-z .'-]{1,49}$/.test(normalizedName)) {
    return res.status(400).json({ error: 'Enter a valid full name using letters only.' });
  }
  if (!/^[6-9]\d{9}$/.test(indianMobile)) {
    return res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
  }
  if (role === 'WORKER' && (!Number.isInteger(Number(experienceYears)) || Number(experienceYears) < 0 || Number(experienceYears) > 60)) {
    return res.status(400).json({ error: 'Work experience must be a whole number between 0 and 60 years.' });
  }

  // Cooperative Admin & Ministry accounts cannot be created via public self-registration
  if (role === 'COOPERATIVE' || role === 'FEDERATION') {
    return res.status(403).json({ 
      error: 'Public registration is restricted to Customers and Technicians. Cooperative Admin & Ministry accounts are pre-provisioned by the Federation Authority.' 
    });
  }

  const inputClean = cleanPhone(phone);
  const existingWorker = store.workers.find(w => cleanPhone(w.phone) === inputClean);
  const existingCust = store.customers.find(c => cleanPhone(c.phone) === inputClean);
  if (existingWorker || existingCust) {
    return res.status(400).json({ error: 'An account with this mobile number is already registered. Please log in.' });
  }

  // Upload profile photo to Cloudinary if provided (base64 data URI)
  let photoUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';
  if (photo && photo.startsWith('data:image')) {
    try {
      photoUrl = await uploadImage(photo, 'sevasetu_profiles');
    } catch (err) {
      console.error('Photo upload failed, using default:', err.message);
    }
  }

  // Upload Certificate Document to Cloudinary if provided
  const { certificateDoc, certificateType, certificateNumber, issuingAuthority } = req.body;
  let certificateDocUrl = 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=600';
  if (certificateDoc && certificateDoc.startsWith('data:')) {
    try {
      certificateDocUrl = await uploadImage(certificateDoc, 'sevasetu_certificates');
    } catch (err) {
      console.error('Certificate document upload failed:', err.message);
    }
  }

  const userId = `usr-${uuidv4()}`;
  let registeredUser = null;

  const userLat = typeof latitude === 'number' ? latitude : 28.6139;
  const userLng = typeof longitude === 'number' ? longitude : 77.2090;
  const userAddr = userAddress || 'Delhi NCR Region';

  if (role === 'WORKER') {
    const selectedCoop = store.cooperatives.find(c => c.id === (coopId || 'coop-1')) || store.cooperatives[0];
    
    const certTitle = certificateType || (Array.isArray(certificates) && certificates[0]) || 'ITI Trade Diploma';
    const certDetails = {
      title: certTitle,
      type: certTitle,
      number: certificateNumber || `CERT-${Math.floor(10000 + Math.random() * 90000)}`,
      issuer: issuingAuthority || 'National Council for Vocational Training (NCVT) / NSDC',
      docUrl: certificateDocUrl,
      issueYear: '2023'
    };

    const newWorker = {
      id: `wrk-${uuidv4()}`,
      name: normalizedName,
      phone: `+91 ${indianMobile}`,
      photo: photoUrl,
      coopId: selectedCoop.id,
      coopName: selectedCoop.name,
      skills: Array.isArray(skills) && skills.length > 0 ? skills : ['Plumbing'],
      experienceYears: Number(experienceYears),
      certificates: [certTitle],
      certificateDetails: [certDetails],
      location: { lat: userLat, lng: userLng, address: userAddr },
      availability: true,
      rating: 0,
      jobsCompleted: 0,
      totalEarnings: 0,
      weeklyEarnings: 0,
      // Newly registered technician profiles require Cooperative Admin approval before receiving jobs
      verificationStatus: 'PENDING',
      gender: 'Male',
      welfare: {
        accountNo: `WEL-DEL-${Math.floor(1000 + Math.random() * 9000)}`,
        fundBalance: 500,
        insuranceActive: true,
        insurancePolicyNo: `PMJJBY-${Math.floor(100000 + Math.random() * 900000)}`,
        trainingsCompleted: 1
      }
    };
    store.workers.unshift(newWorker);
    registeredUser = { ...newWorker, role: 'WORKER' };
  } else if (role === 'COOPERATIVE') {
    registeredUser = {
      id: userId,
      name,
      phone,
      photo: photoUrl,
      role: 'COOPERATIVE',
      coopId: 'coop-1',
      coopName: 'Delhi Shramik Swavalamban Cooperative Society'
    };
  } else if (role === 'FEDERATION') {
    registeredUser = {
      id: userId,
      name,
      phone,
      photo: photoUrl,
      role: 'FEDERATION',
      ministryName: 'Ministry of Cooperation'
    };
  } else {
    // CUSTOMER
    const newCust = {
      id: `cust-${uuidv4()}`,
      name,
      phone,
      photo: photoUrl,
      email: email ? email.trim() : null,
      location: { lat: userLat, lng: userLng, address: userAddr }
    };
    store.customers.unshift(newCust);
    registeredUser = { ...newCust, role: 'CUSTOMER' };
  }

  // Do not report a successful registration until the durable record exists.
  if (registeredUser.role === 'WORKER' || registeredUser.role === 'CUSTOMER') {
    try {
      await saveUser(registeredUser);
    } catch (err) {
      store.workers = store.workers.filter(w => w.id !== registeredUser.id);
      store.customers = store.customers.filter(c => c.id !== registeredUser.id);
      console.error('MongoDB account save failed:', err.message);
      return res.status(503).json({ error: 'Account could not be saved to the database. Please try again.' });
    }
  }

  const token = jwt.sign(registeredUser, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    user: registeredUser,
    token
  });
});

// 1.5 Update User Profile
app.patch('/api/users/profile', async (req, res) => {
  const { id, role, name, phone, email, location } = req.body;

  let targetUser = null;
  const cleanP = phone ? cleanPhone(phone) : null;

  if (role === 'WORKER') {
    const worker = store.workers.find(w => w.id === id || (cleanP && cleanPhone(w.phone) === cleanP));
    if (worker) {
      if (name) worker.name = name.trim();
      if (phone) worker.phone = phone.trim();
      if (email) worker.email = email.trim();
      if (location) worker.location = typeof location === 'object' ? location : { ...worker.location, address: location };
      targetUser = { ...worker, role: 'WORKER' };
    }
  } else {
    const customer = store.customers.find(c => c.id === id || (cleanP && c.phone && cleanPhone(c.phone) === cleanP));
    if (customer) {
      if (name) customer.name = name.trim();
      if (phone) customer.phone = phone.trim();
      if (email) customer.email = email.trim();
      if (location) customer.location = typeof location === 'object' ? location : { ...customer.location, address: location };
      targetUser = { ...customer, role: 'CUSTOMER' };
    } else if (store.customers.length > 0) {
      const c = store.customers[0];
      if (name) c.name = name.trim();
      if (phone) c.phone = phone.trim();
      if (email) c.email = email.trim();
      if (location) c.location = typeof location === 'object' ? location : { ...c.location, address: location };
      targetUser = { ...c, role: 'CUSTOMER' };
    }
  }

  if (!targetUser) {
    targetUser = { id: id || 'usr-1', name: name || 'User', phone: phone || '+91 98765 43210', email, location, role: role || 'CUSTOMER' };
  }

  try {
    await saveUser(targetUser);
  } catch (err) {
    console.error('MongoDB profile update failed:', err.message);
    return res.status(500).json({ error: 'Profile could not be saved to the database.' });
  }

  const token = jwt.sign(targetUser, JWT_SECRET, { expiresIn: '7d' });
  return res.json({ success: true, message: 'Profile updated successfully', user: targetUser, token });
});

// 2. User Login
app.post('/api/auth/login', (req, res) => {
  const { phone, role } = req.body;

  if (!phone || !phone.trim()) {
    return res.status(400).json({ error: 'Mobile number is required for login.' });
  }

  let loggedInUser = null;
  const inputClean = cleanPhone(phone);

  if (role === 'WORKER') {
    const worker = store.workers.find(w => cleanPhone(w.phone) === inputClean || w.phone === phone.trim());
    if (worker) {
      loggedInUser = { ...worker, role: 'WORKER' };
    } else {
      return res.status(404).json({ error: 'No technician account found registered with this mobile number. Please click Register first.' });
    }
  } else if (role === 'CUSTOMER') {
    const cust = store.customers.find(c => cleanPhone(c.phone) === inputClean || c.phone === phone.trim());
    if (cust) {
      loggedInUser = { ...cust, role: 'CUSTOMER' };
    } else {
      return res.status(404).json({ error: 'No customer account found registered with this mobile number. Please click Register first.' });
    }
  } else if (role === 'COOPERATIVE') {
    return res.status(403).json({ error: 'Cooperative Admin accounts are pre-provisioned by the Federation Authority. Please use your issued credentials.' });
  } else if (role === 'FEDERATION') {
    return res.status(403).json({ error: 'Ministry accounts are pre-provisioned by the Federation Authority. Please use your issued credentials.' });
  } else {
    return res.status(400).json({ error: 'Invalid account role specified.' });
  }

  if (!loggedInUser) {
    return res.status(404).json({ error: 'Account not found. Please check phone number or register first.' });
  }

  const token = jwt.sign(loggedInUser, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    success: true,
    message: `Logged in successfully as ${loggedInUser.name}`,
    user: loggedInUser,
    token
  });
});

// 3. Get Current User Profile
app.get('/api/auth/me', authenticateToken, (req, res) => {
  let liveUser = req.user;
  if (req.user.role === 'WORKER') {
    const found = store.workers.find(w => w.id === req.user.id || w.phone === req.user.phone);
    if (found) liveUser = { ...found, role: 'WORKER' };
  } else if (req.user.role === 'CUSTOMER') {
    const found = store.customers.find(c => c.id === req.user.id || c.phone === req.user.phone);
    if (found) liveUser = { ...found, role: 'CUSTOMER' };
  }
  res.json({ user: liveUser });
});

// ----------------------------------------------------
// CORE PLATFORM API ENDPOINTS
// ----------------------------------------------------

// 4. Get all Services
app.get('/api/services', (req, res) => {
  res.json(store.services);
});

// 5. Get all Cooperatives (with dynamic aggregations)
app.get('/api/cooperatives', (req, res) => {
  const dynamicCoops = store.cooperatives.map(coop => {
    const coopWorkers = store.workers.filter(w => w.coopId === coop.id);
    const welfareBalance = coopWorkers.reduce((acc, w) => acc + (w.welfare?.fundBalance || 0), 0);
    const activeJobs = coopWorkers.reduce((acc, w) => acc + (w.jobsCompleted || 0), 0);
    return {
      ...coop,
      totalWorkers: coopWorkers.length,
      activeJobs,
      welfareBalance
    };
  });
  res.json(dynamicCoops);
});

// 6. Get Workers
app.get('/api/workers', (req, res) => {
  const { coopId, status } = req.query;
  let results = store.workers;
  if (coopId) {
    results = results.filter(w => w.coopId === coopId);
  }
  if (status) {
    results = results.filter(w => w.verificationStatus === status);
  }
  res.json(results);
});

// 7. Onboard / Verify Worker
app.post('/api/workers/verify', async (req, res) => {
  const { workerId, action, status, notes } = req.body;
  const worker = store.workers.find(w => w.id === workerId);
  if (!worker) {
    return res.status(404).json({ error: 'Worker not found' });
  }
  worker.verificationStatus = status || (action === 'VERIFY' ? 'VERIFIED' : 'REJECTED');
  if (notes) worker.verificationNotes = notes;
  try { await saveUser({ ...worker, role: 'WORKER' }); } catch (err) { return res.status(500).json({ error: 'Worker verification could not be saved.' }); }
  res.json({ success: true, worker });
});

// Keep the technician's availability in sync with matching and the worker portal.
app.patch('/api/workers/:id/availability', async (req, res) => {
  const worker = store.workers.find(w => String(w.id) === String(req.params.id));
  if (!worker) return res.status(404).json({ error: 'Worker not found' });

  worker.availability = Boolean(req.body.availability);
  try { await saveUser({ ...worker, role: 'WORKER' }); } catch (err) { return res.status(500).json({ error: 'Availability could not be saved.' }); }
  res.json({ success: true, worker });
});

// 8. Fair Match Preview
app.post('/api/bookings/match', (req, res) => {
  const { serviceName, latitude, longitude, emergency } = req.body;
  const lat = latitude || 28.6139;
  const lng = longitude || 77.2090;

  const result = findBestWorkerMatch(serviceName, lat, lng, !!emergency);
  if (result.error) {
    return res.status(400).json(result);
  }

  res.json(result);
});

// 9. Create Booking (With Haversine distance-based dynamic pricing)
app.post('/api/bookings/create', async (req, res) => {
  const {
    customerId, customerName, customerPhone, customerPhoto, serviceId, serviceName, workerId,
    address, latitude, longitude, scheduledTime, emergency,
    scheduledDate, scheduledSlot, paymentMethod, paymentStatus: payStatus,
    matchRationale: passedRationale
  } = req.body;

  const service = store.services.find(s => s.id === serviceId) || { basePrice: 450 };
  const worker = store.workers.find(w => w.id === workerId);

  if (!worker) {
    return res.status(400).json({ error: 'Selected worker is unavailable' });
  }

  // Prevent assigning a worker who already has an ongoing active job
  const hasActiveJob = store.bookings.some(b => 
    (b.workerId === worker.id || (b.workerName && b.workerName.toLowerCase() === worker.name.toLowerCase())) &&
    ['ASSIGNED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS', 'MATERIAL_REQUESTED'].includes(b.status)
  );

  if (hasActiveJob) {
    return res.status(400).json({ error: `Technician ${worker.name} is currently busy with another active job. Please select another technician.` });
  }

  const custLat = typeof latitude === 'number' ? latitude : 28.6139;
  const custLng = typeof longitude === 'number' ? longitude : 77.2090;
  const wrkLat = worker.location?.lat || 28.6139;
  const wrkLng = worker.location?.lng || 77.2090;

  // Haversine Distance & Invite Fee Calculation
  const distanceKm = parseFloat(getHaversineDistance(custLat, custLng, wrkLat, wrkLng).toFixed(2));
  const inviteFee = calculateInviteFee(distanceKm);
  const labourCost = service.basePrice || 450;
  const emergencyFee = emergency ? 50 : 0;
  const subtotal = inviteFee + labourCost + emergencyFee;
  const serviceTax = parseFloat((subtotal * 0.05).toFixed(2));
  const initialEstimate = parseFloat((subtotal + serviceTax).toFixed(2));

  const coopPlatformFee = parseFloat((initialEstimate * 0.05).toFixed(2));
  const welfareContribution = parseFloat((initialEstimate * 0.05).toFixed(2));
  const workerPayout = parseFloat((initialEstimate - coopPlatformFee - welfareContribution).toFixed(2));

  const newBooking = {
    id: `BK-${uuidv4()}`,
    customerId: customerId || 'cust-1',
    customerName: customerName || 'Customer',
    customerPhone: customerPhone || '+91 98990 12345',
    customerPhoto: customerPhoto || null,
    workerId: worker.id,
    workerName: worker.name,
    workerPhone: worker.phone,
    coopName: worker.coopName,
    serviceId: serviceId || 'srv-1',
    serviceName: serviceName || 'Service',
    status: 'ASSIGNED',
    emergency: !!emergency,
    scheduledTime: scheduledTime || new Date().toISOString(),
    scheduledDate: scheduledDate || null,
    scheduledSlot: scheduledSlot || null,
    address: address || 'Delhi NCR Region',
    latitude: custLat,
    longitude: custLng,
    pricing: {
      inviteFee: parseFloat(inviteFee.toFixed(2)),
      labourCost: parseFloat(labourCost.toFixed(2)),
      emergencyFee: parseFloat(emergencyFee.toFixed(2)),
      distanceKm,
      subtotal: parseFloat(subtotal.toFixed(2)),
      serviceTax: parseFloat(serviceTax.toFixed(2)),
      totalAmount: parseFloat(initialEstimate.toFixed(2)),
      coopPlatformFee,
      welfareContribution,
      workerPayout
    },
    paymentStatus: payStatus || 'UNPAID',
    paymentMethod: paymentMethod || 'UPI / Online',
    createdAt: new Date().toISOString(),
    matchRationale: passedRationale || `Assigned ${worker.name} (${worker.coopName}): Verified technician (${distanceKm} km away, Invite Fee: ₹${inviteFee}, Labour: ₹${labourCost}).`
  };

  store.bookings.unshift(newBooking);

  try {
    await saveBooking(newBooking);
  } catch (err) {
    store.bookings = store.bookings.filter(b => b.id !== newBooking.id);
    console.error('MongoDB booking save failed:', err.message);
    return res.status(500).json({ error: 'Booking could not be saved to the database. Please try again.' });
  }

  res.status(201).json({ success: true, booking: newBooking });
});

// 10. Update Booking Status
app.patch('/api/bookings/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const booking = store.bookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  // If worker tries to mark complete but material cost is still unpaid, retain MATERIAL_REQUESTED status
  if (status === 'COMPLETED' && (booking.materialPaymentStatus === 'UNPAID' || (booking.finalReceipt && booking.finalReceipt.status === 'PENDING_MATERIAL_PAYMENT'))) {
    booking.status = 'MATERIAL_REQUESTED';
    booking.hasPendingMaterialCost = true;
  } else {
    booking.status = status;
  }

  // When the worker manually confirms completion, credit earnings & welfare contribution
  if (status === 'COMPLETED' && booking.materialPaymentStatus !== 'UNPAID' && !booking.completionRecordedAt) {
    const worker = store.workers.find(w => w.id === booking.workerId);
    const workerPayout = booking.finalReceipt?.workerPayout || booking.pricing?.workerPayout || 427.50;
    const welfareContribution = booking.finalReceipt?.welfareContribution || booking.pricing?.welfareContribution || 23.75;

    if (worker) {
      worker.jobsCompleted += 1;
      worker.totalEarnings += workerPayout;
      worker.weeklyEarnings += workerPayout;
      if (worker.welfare) {
        worker.welfare.fundBalance += welfareContribution;
      }
    }

    const welfareTx = {
      id: `WT-${uuidv4()}`,
      workerId: booking.workerId,
      workerName: booking.workerName,
      type: 'CONTRIBUTION',
      amount: welfareContribution,
      description: `5% Welfare Fund contribution from Booking #${booking.id} (Receipt ${booking.finalReceipt?.receiptNo || 'RCT'})`,
      date: new Date().toISOString()
    };
    store.welfareTransactions.unshift(welfareTx);
    booking.completionRecordedAt = new Date().toISOString();
    try {
      await Promise.all([
        saveUser({ ...worker, role: 'WORKER' }),
        saveWelfareTransaction(welfareTx)
      ]);
    } catch (err) {
      return res.status(500).json({ error: 'Completion accounting could not be saved to the database.' });
    }
  }

  try { await saveBooking(booking); } catch (err) { return res.status(500).json({ error: 'Booking status could not be saved to the database.' }); }

  res.json({ success: true, booking });
});

// 10B. Technician Requests Material Cost / Finalizes Work Receipt
app.post('/api/bookings/:id/generate-bill', async (req, res) => {
  const { id } = req.params;
  const { materialsCost, materialDetails, workNotes } = req.body;

  const booking = store.bookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const matCost = parseFloat(parseFloat(materialsCost || 0).toFixed(2));
  const inviteFee = booking.pricing?.inviteFee || calculateInviteFee(booking.pricing?.distanceKm || 1.2);
  const labourCost = booking.pricing?.labourCost || 450;
  const distanceKm = booking.pricing?.distanceKm || 1.2;
  const alreadyPaidAmount = parseFloat((booking.pricing?.totalAmount || Math.round((inviteFee + labourCost) * 1.05)).toFixed(2));

  // Material cost calculation (Only charge additional material cost to customer)
  const materialTax = parseFloat((matCost * 0.05).toFixed(2));
  const amountDueNow = parseFloat((matCost + materialTax).toFixed(2));

  const grandTotal = parseFloat((alreadyPaidAmount + amountDueNow).toFixed(2));

  const coopPlatformFee = parseFloat((grandTotal * 0.05).toFixed(2));
  const welfareContribution = parseFloat((grandTotal * 0.05).toFixed(2));
  const workerPayout = parseFloat((grandTotal - coopPlatformFee - welfareContribution).toFixed(2));

  const receipt = {
    receiptNo: `RCT-${uuidv4()}`,
    generatedAt: new Date().toISOString(),
    inviteFee: parseFloat(Number(inviteFee).toFixed(2)),
    labourCost: parseFloat(Number(labourCost).toFixed(2)),
    distanceKm,
    alreadyPaidAmount,
    materialsCost: matCost,
    materialDetails: materialDetails || 'Material & spare parts used for repair',
    materialTax,
    amountDueNow,
    workNotes: workNotes || 'Job completed successfully by verified technician.',
    grandTotal,
    coopPlatformFee,
    welfareContribution,
    workerPayout,
    status: matCost > 0 ? 'PENDING_MATERIAL_PAYMENT' : 'PAID'
  };

  booking.finalReceipt = receipt;
  booking.materialPaymentStatus = matCost > 0 ? 'UNPAID' : 'PAID';
  booking.hasPendingMaterialCost = matCost > 0;
  // Do NOT auto-complete. The technician must manually confirm completion.
  booking.status = 'MATERIAL_REQUESTED';
  booking.pricing = {
    ...booking.pricing,
    materialsCost: matCost,
    amountDueNow,
    totalAmount: grandTotal,
    workerPayout,
    welfareContribution,
    coopPlatformFee
  };

  try { await saveBooking(booking); } catch (err) { return res.status(500).json({ error: 'Bill could not be saved to the database.' }); }

  res.json({ success: true, message: 'Digital receipt / Material request generated successfully', booking, receipt });
});

// 10C. Customer Pays Final Bill Receipt
app.post('/api/bookings/:id/pay-bill', async (req, res) => {
  const { id } = req.params;
  const { paymentMethod } = req.body;

  const booking = store.bookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.finalReceipt) {
    booking.finalReceipt.status = 'PAID';
    booking.finalReceipt.paidAt = new Date().toISOString();
  }
  booking.materialPaymentStatus = 'PAID';
  booking.hasPendingMaterialCost = false;
  // Do NOT auto-complete the job. The technician must manually confirm completion.
  booking.paymentStatus = 'PAID';
  booking.paymentMethod = paymentMethod || 'UPI / Online';

  try { await saveBooking(booking); } catch (err) { return res.status(500).json({ error: 'Payment could not be saved to the database.' }); }

  res.json({ success: true, message: 'Material payment recorded. The technician will confirm work completion.', booking });
});

// 11. Get Bookings
app.get('/api/bookings', (req, res) => {
  const { workerId, customerId } = req.query;
  let results = store.bookings;
  if (workerId) {
    results = results.filter(b => String(b.workerId) === String(workerId));
  }
  if (customerId) {
    results = results.filter(b => String(b.customerId) === String(customerId));
  }
  res.json(results);
});

// Public, read-only review feed for the technician profile shown before booking.
app.get('/api/workers/:workerId/reviews', (req, res) => {
  const param = String(req.params.workerId).toLowerCase().trim();
  const worker = store.workers.find(w => 
    String(w.id).toLowerCase() === param || 
    w.name?.toLowerCase() === param
  );
  
  const targetWorkerId = worker ? String(worker.id).toLowerCase() : param;
  const targetWorkerName = worker ? worker.name?.toLowerCase() : param;

  const bookingReviews = store.bookings
    .filter(b => {
      const matchId = b.workerId && String(b.workerId).toLowerCase() === targetWorkerId;
      const matchName = b.workerName && (b.workerName.toLowerCase() === targetWorkerName || b.workerName.toLowerCase() === param);
      const hasContent = (b.workerRating || (b.workerFeedback && b.workerFeedback.trim() !== ''));
      return (matchId || matchName) && hasContent;
    })
    .map(b => ({
      rating: b.workerRating || 5,
      feedback: b.workerFeedback || '',
      serviceName: b.serviceName || 'Household Service',
      customerName: b.customerName || 'Customer',
      customerPhoto: b.customerPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      date: 'Recently'
    }));

  if (!store.reviews) store.reviews = [];
  const standaloneReviews = store.reviews.filter(r => 
    (r.workerId && String(r.workerId).toLowerCase() === param) ||
    (r.workerName && r.workerName.toLowerCase() === param) ||
    (targetWorkerId && String(r.workerId).toLowerCase() === targetWorkerId) ||
    (targetWorkerName && r.workerName?.toLowerCase() === targetWorkerName)
  );

  const workerDirectReviews = worker?.reviews || [];

  const reviewsMap = new Map();
  [...bookingReviews, ...workerDirectReviews, ...standaloneReviews].forEach(r => {
    const key = `${r.customerName}-${r.rating}-${r.feedback}`;
    if (!reviewsMap.has(key)) {
      reviewsMap.set(key, r);
    }
  });

  const combinedReviews = Array.from(reviewsMap.values());
  res.json({ reviews: combinedReviews });
});

// 12A. Customer Rates Worker
app.post('/api/ratings', async (req, res) => {
  const { bookingId, workerId, rating, feedback, customerName, customerPhoto } = req.body;
  const numRating = parseInt(rating) || 5;

  const booking = store.bookings.find(b => b.id === bookingId);
  if (booking) {
    booking.workerRating = numRating;
    booking.workerFeedback = feedback || '';
  }

  const targetWorkerId = workerId || booking?.workerId;
  const targetWorkerName = booking?.workerName || workerId;

  const worker = store.workers.find(w => 
    (targetWorkerId && String(w.id).toLowerCase() === String(targetWorkerId).toLowerCase()) ||
    (targetWorkerName && (w.name === targetWorkerName || w.name?.toLowerCase() === targetWorkerName?.toLowerCase()))
  );

  const newReview = {
    workerId: targetWorkerId,
    workerName: targetWorkerName,
    rating: numRating,
    feedback: feedback?.trim() || '',
    serviceName: booking?.serviceName || 'Household Service',
    customerName: customerName || booking?.customerName || 'Customer',
    customerPhoto: customerPhoto || booking?.customerPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    date: 'Just now'
  };

  if (worker) {
    const currentJobs = worker.jobsCompleted || 1;
    const currentTotal = (worker.rating || 5.0) * currentJobs;
    worker.jobsCompleted = currentJobs + 1;
    worker.rating = parseFloat(((currentTotal + numRating) / worker.jobsCompleted).toFixed(2));
    worker.reviews = worker.reviews || [];
    worker.reviews.unshift(newReview);
  }

  if (!store.reviews) store.reviews = [];
  store.reviews.unshift(newReview);

  try {
    await Promise.all([
      booking ? saveBooking(booking) : Promise.resolve(),
      worker ? saveUser({ ...worker, role: 'WORKER' }) : Promise.resolve()
    ]);
  } catch (err) {
    return res.status(500).json({ error: 'Rating could not be saved to the database.' });
  }

  res.json({ success: true, message: 'Worker rating submitted successfully', booking, worker, review: newReview });
});

// 12B. Worker Rates Customer (Mutual Rating System)
app.post('/api/ratings/customer', async (req, res) => {
  const { bookingId, customerId, rating, feedback } = req.body;
  const numRating = parseInt(rating) || 5;

  const booking = store.bookings.find(b => b.id === bookingId);
  if (booking) {
    booking.customerRating = numRating;
    booking.customerFeedback = feedback || 'Friendly customer, smooth work experience.';
  }

  const customer = store.customers.find(c => c.id === customerId);
  if (customer) {
    const currentTotal = (customer.rating || 5.0) * (customer.jobsBooked || 1);
    customer.jobsBooked = (customer.jobsBooked || 1) + 1;
    customer.rating = parseFloat(((currentTotal + numRating) / customer.jobsBooked).toFixed(2));
  }

  try {
    await Promise.all([
      booking ? saveBooking(booking) : Promise.resolve(),
      customer ? saveUser({ ...customer, role: 'CUSTOMER' }) : Promise.resolve()
    ]);
  } catch (err) {
    return res.status(500).json({ error: 'Customer rating could not be saved to the database.' });
  }

  res.json({ success: true, message: 'Customer rating submitted successfully', booking });
});

// 13. File Complaint
app.post('/api/complaints', async (req, res) => {
  const { bookingId, reportedBy, complainantName, customerName, customerPhone, issue, description } = req.body;
  const reporterName = complainantName || customerName || 'Customer';
  const complaintText = issue || description;
  if (!complaintText || !String(complaintText).trim()) {
    return res.status(400).json({ error: 'Complaint description is required.' });
  }
  const newComplaint = {
    id: `CMP-${uuidv4()}`,
    bookingId: bookingId || 'BK-1001',
    reportedBy: reportedBy || 'CUSTOMER',
    complainantName: reporterName,
    customerName: reporterName,
    customerPhone: customerPhone || 'N/A',
    issue: String(complaintText).trim(),
    description: String(complaintText).trim(),
    status: 'OPEN',
    coopNotes: 'Under review by Cooperative Admin committee',
    createdAt: new Date().toISOString()
  };
  store.complaints.unshift(newComplaint);
  try { await saveComplaint(newComplaint); } catch (err) { return res.status(500).json({ error: 'Complaint could not be saved to the database.' }); }
  res.status(201).json({ success: true, complaint: newComplaint });
});

// 14. Welfare Stats
app.get('/api/welfare', (req, res) => {
  const totalWelfareFund = store.workers.reduce((acc, w) => acc + (w.welfare ? w.welfare.fundBalance : 0), 0);
  const insuredWorkers = store.workers.filter(w => w.welfare && w.welfare.insuranceActive).length;

  res.json({
    totalWelfareFund,
    totalWorkers: store.workers.length,
    insuredWorkers,
    insuranceCoveragePercent: Math.round((insuredWorkers / store.workers.length) * 100),
    transactions: store.welfareTransactions
  });
});

// 15. Ministry Analytics
app.get('/api/federation/analytics', (req, res) => {
  const dynamicCoops = store.cooperatives.map(coop => {
    const coopWorkers = store.workers.filter(w => w.coopId === coop.id);
    const welfareBalance = coopWorkers.reduce((acc, w) => acc + (w.welfare?.fundBalance || 0), 0);
    const activeJobs = coopWorkers.reduce((acc, w) => acc + (w.jobsCompleted || 0), 0);
    return {
      ...coop,
      totalWorkers: coopWorkers.length,
      activeJobs,
      welfareBalance
    };
  });

  const totalCooperatives = store.cooperatives.length;
  const totalWorkers = store.workers.length;
  const femaleWorkers = store.workers.filter(w => w.gender === 'Female').length;
  const totalJobsCompleted = store.workers.reduce((acc, w) => acc + (w.jobsCompleted || 0), 0);
  const totalWorkerEarnings = store.workers.reduce((acc, w) => acc + (w.totalEarnings || 0), 0);
  const avgWorkerIncome = totalWorkers ? Math.round(totalWorkerEarnings / totalWorkers) : 0;
  const totalWelfareFundDisbursed = store.welfareTransactions
    .filter(t => t.type === 'STIPEND')
    .reduce((acc, t) => acc + t.amount, 0);

  res.json({
    summary: {
      totalCooperatives,
      totalWorkers,
      activeWorkers: store.workers.filter(w => w.availability).length,
      femaleWorkers,
      femaleParticipationPercent: totalWorkers ? Math.round((femaleWorkers / totalWorkers) * 100) : 0,
      totalJobsCompleted,
      totalWorkerEarnings,
      avgWorkerIncome,
      totalWelfareFundDisbursed
    },
    districtDemands: store.demandPredictions,
    cooperatives: dynamicCoops
  });
});

// 16. AI Demand Forecast
app.get('/api/ai/forecast', (req, res) => {
  res.json({
    districtDemands: store.demandPredictions,
    shortageAlerts: [
      { district: 'Central Delhi', service: 'Plumbing', current: 142, forecast: 184, shortage: 6, priority: 'HIGH' },
      { district: 'Noida', service: 'AC Service & Repair', current: 110, forecast: 158, shortage: 10, priority: 'URGENT' },
      { district: 'South Delhi', service: 'Deep Cleaning', current: 98, forecast: 135, shortage: 8, priority: 'HIGH' }
    ]
  });
});

// 17. File a Complaint
// 18. Get all Complaints (for cooperative admin)
app.get('/api/complaints', (req, res) => {
  res.json(store.complaints || []);
});

// 19. Resolve Complaint
app.post('/api/complaints/resolve', async (req, res) => {
  const { complaintId, notes } = req.body;
  const complaint = (store.complaints || []).find(c => c.id === complaintId);
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }
  complaint.status = 'RESOLVED';
  complaint.coopNotes = notes || 'Resolved by Cooperative Committee';
  complaint.resolvedAt = new Date().toISOString();
  try { await saveComplaint(complaint); } catch (err) { return res.status(500).json({ error: 'Complaint resolution could not be saved to the database.' }); }
  res.json({ success: true, complaint });
});

// Global Express error handler — prevents unhandled route errors from crashing the server
app.use((err, req, res, next) => {
  console.error('[EXPRESS ERROR]', err.message, err.stack);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start Express Server
loadPersistentData.finally(() => {
  app.listen(PORT, () => {
    console.log(`Sahkaar / SevaSetu Core Backend server listening on port ${PORT}`);
  });
});
