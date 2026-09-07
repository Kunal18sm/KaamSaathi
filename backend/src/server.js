require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const connectDB = require('./db/connect');
const store = require('./db/store');
const { findBestWorkerMatch, getHaversineDistance } = require('./services/matchingEngine');
const { uploadImage } = require('./utils/cloudinary');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'sahkaar_sevasetu_secret_key_2026';

app.use(cors());
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Initialize MongoDB Connection at startup
connectDB();

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

const cleanPhone = (p) => p ? String(p).replace(/[^\d]/g, '') : '';

// 1. User Register (Customer, Worker, Coop Admin)
app.post('/api/auth/register', async (req, res) => {
  const { 
    name, phone, email, password, role, coopId, skills, experienceYears, certificates, photo,
    latitude, longitude, address: userAddress
  } = req.body;

  if (!phone || !name || !role) {
    return res.status(400).json({ error: 'Name, phone, and role are required' });
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

  const userId = `usr-${Math.floor(1000 + Math.random() * 9000)}`;
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
      id: `wrk-${Math.floor(100 + Math.random() * 900)}`,
      name,
      phone,
      photo: photoUrl,
      coopId: selectedCoop.id,
      coopName: selectedCoop.name,
      skills: Array.isArray(skills) && skills.length > 0 ? skills : ['Plumbing'],
      experienceYears: parseInt(experienceYears) || 2,
      certificates: [certTitle],
      certificateDetails: [certDetails],
      location: { lat: userLat, lng: userLng, address: userAddr },
      availability: true,
      rating: 5.0,
      jobsCompleted: 0,
      totalEarnings: 0,
      weeklyEarnings: 0,
      verificationStatus: 'PENDING_REVIEW',
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
      id: `cust-${Math.floor(100 + Math.random() * 900)}`,
      name,
      phone,
      photo: photoUrl,
      email: email || `${phone}@sevasetu.in`,
      location: { lat: userLat, lng: userLng, address: userAddr }
    };
    store.customers.unshift(newCust);
    registeredUser = { ...newCust, role: 'CUSTOMER' };
  }

  const token = jwt.sign(registeredUser, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    success: true,
    message: 'Account created successfully',
    user: registeredUser,
    token
  });
});

// 2. User Login
app.post('/api/auth/login', (req, res) => {
  const { phone, role, demoRole } = req.body;

  let loggedInUser = null;

  if (demoRole) {
    if (demoRole === 'CUSTOMER') {
      const cust = store.customers[0];
      if (!cust) return res.status(404).json({ error: 'No customer account registered yet. Please register first.' });
      loggedInUser = { ...cust, role: 'CUSTOMER' };
    } else if (demoRole === 'WORKER') {
      const wrk = store.workers[0];
      if (!wrk) return res.status(404).json({ error: 'No technician account registered yet. Please register first.' });
      loggedInUser = { ...wrk, role: 'WORKER' };
    } else if (demoRole === 'COOPERATIVE') {
      loggedInUser = {
        id: 'coop-admin-1',
        name: 'Suresh Chandra Sharma',
        phone: '+91 98765 43210',
        role: 'COOPERATIVE',
        coopId: 'coop-1',
        coopName: 'Delhi Shramik Swavalamban Cooperative Society'
      };
    } else if (demoRole === 'FEDERATION') {
      loggedInUser = {
        id: 'fed-admin-1',
        name: 'Ministry Official',
        phone: '+91 11 2338 1234',
        role: 'FEDERATION',
        ministryName: 'Ministry of Cooperation'
      };
    }
  } else {
    if (!phone || !phone.trim()) {
      return res.status(400).json({ error: 'Mobile number is required for login.' });
    }

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
      loggedInUser = {
        id: 'coop-admin-1',
        name: 'Suresh Chandra Sharma',
        phone: phone.trim(),
        role: 'COOPERATIVE',
        coopId: 'coop-1',
        coopName: 'Delhi Shramik Swavalamban Cooperative Society'
      };
    } else if (role === 'FEDERATION') {
      loggedInUser = {
        id: 'fed-admin-1',
        name: 'Ministry Official',
        phone: phone.trim(),
        role: 'FEDERATION',
        ministryName: 'Ministry of Cooperation'
      };
    }
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
app.post('/api/workers/verify', (req, res) => {
  const { workerId, action } = req.body;
  const worker = store.workers.find(w => w.id === workerId);
  if (!worker) {
    return res.status(404).json({ error: 'Worker not found' });
  }
  worker.verificationStatus = action === 'VERIFY' ? 'VERIFIED' : 'REJECTED';
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
app.post('/api/bookings/create', (req, res) => {
  const {
    customerId, customerName, customerPhone, serviceId, serviceName, workerId,
    address, latitude, longitude, scheduledTime, emergency,
    scheduledDate, scheduledSlot, paymentMethod, paymentStatus: payStatus,
    matchRationale: passedRationale
  } = req.body;

  const service = store.services.find(s => s.id === serviceId) || { basePrice: 500 };
  const worker = store.workers.find(w => w.id === workerId);

  if (!worker) {
    return res.status(400).json({ error: 'Selected worker is unavailable' });
  }

  const custLat = typeof latitude === 'number' ? latitude : 28.6139;
  const custLng = typeof longitude === 'number' ? longitude : 77.2090;
  const wrkLat = worker.location?.lat || 28.6139;
  const wrkLng = worker.location?.lng || 77.2090;

  // Haversine Distance Fare Calculation
  const distanceKm = parseFloat(getHaversineDistance(custLat, custLng, wrkLat, wrkLng).toFixed(2));
  const baseFee = 150; // Base inspection & setup fee
  const perKmRate = 25; // ₹25 per kilometer
  const distanceCharge = Math.max(30, Math.round(distanceKm * perKmRate));
  const subtotal = baseFee + distanceCharge;
  const serviceTax = Math.round(subtotal * 0.05);
  const initialEstimate = subtotal + serviceTax;

  const coopPlatformFee = parseFloat((initialEstimate * 0.05).toFixed(2));
  const welfareContribution = parseFloat((initialEstimate * 0.05).toFixed(2));
  const workerPayout = parseFloat((initialEstimate - coopPlatformFee - welfareContribution).toFixed(2));

  const newBooking = {
    id: `BK-${Math.floor(1000 + Math.random() * 9000)}`,
    customerId: customerId || 'cust-1',
    customerName: customerName || 'Customer',
    customerPhone: customerPhone || '+91 98990 12345',
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
      baseFee,
      perKmRate,
      distanceKm,
      distanceCharge,
      subtotal,
      serviceTax,
      totalAmount: initialEstimate,
      coopPlatformFee,
      welfareContribution,
      workerPayout
    },
    paymentStatus: payStatus || 'UNPAID',
    paymentMethod: paymentMethod || 'UPI / Online',
    createdAt: new Date().toISOString(),
    matchRationale: passedRationale || `Assigned ${worker.name} (${worker.coopName}): Verified technician (${distanceKm} km away, ₹${distanceCharge} travel fare).`
  };

  store.bookings.unshift(newBooking);

  res.status(201).json({ success: true, booking: newBooking });
});

// 10. Update Booking Status
app.patch('/api/bookings/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const booking = store.bookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  booking.status = status;
  res.json({ success: true, booking });
});

// 10B. Technician Finalizes Work & Generates Bill Receipt
app.post('/api/bookings/:id/generate-bill', (req, res) => {
  const { id } = req.params;
  const { materialsCost, materialDetails, extraLaborCharge, workNotes } = req.body;

  const booking = store.bookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  const matCost = parseFloat(materialsCost) || 0;
  const extraLabor = parseFloat(extraLaborCharge) || 0;
  const baseFee = booking.pricing?.baseFee || 150;
  const distanceCharge = booking.pricing?.distanceCharge || 30;
  const distanceKm = booking.pricing?.distanceKm || 1.2;

  const grossTotal = baseFee + distanceCharge + matCost + extraLabor;
  const serviceTax = Math.round(grossTotal * 0.05);
  const grandTotal = grossTotal + serviceTax;

  const coopPlatformFee = parseFloat((grandTotal * 0.05).toFixed(2));
  const welfareContribution = parseFloat((grandTotal * 0.05).toFixed(2));
  const workerPayout = parseFloat((grandTotal - coopPlatformFee - welfareContribution).toFixed(2));

  const receipt = {
    receiptNo: `RCT-${Math.floor(1000 + Math.random() * 9000)}`,
    generatedAt: new Date().toISOString(),
    baseFee,
    distanceKm,
    distanceCharge,
    materialsCost: matCost,
    materialDetails: materialDetails || 'Material & spare parts used for repair',
    extraLaborCharge: extraLabor,
    workNotes: workNotes || 'Job completed successfully by verified technician.',
    grossTotal,
    serviceTax,
    grandTotal,
    coopPlatformFee,
    welfareContribution,
    workerPayout,
    status: 'PENDING_CUSTOMER_PAYMENT'
  };

  booking.finalReceipt = receipt;
  booking.status = 'BILL_GENERATED';
  booking.pricing = {
    ...booking.pricing,
    totalAmount: grandTotal,
    workerPayout,
    welfareContribution,
    coopPlatformFee
  };

  res.json({ success: true, message: 'Digital receipt generated successfully', booking, receipt });
});

// 10C. Customer Pays Final Bill Receipt
app.post('/api/bookings/:id/pay-bill', (req, res) => {
  const { id } = req.params;
  const { paymentMethod } = req.body;

  const booking = store.bookings.find(b => b.id === id);
  if (!booking) {
    return res.status(404).json({ error: 'Booking not found' });
  }

  if (booking.finalReceipt) {
    booking.finalReceipt.status = 'PAID';
  }
  booking.status = 'COMPLETED';
  booking.paymentStatus = 'PAID';
  booking.paymentMethod = paymentMethod || 'UPI / Online';

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
    id: `WT-${Math.floor(500 + Math.random() * 500)}`,
    workerId: booking.workerId,
    workerName: booking.workerName,
    type: 'CONTRIBUTION',
    amount: welfareContribution,
    description: `5% Welfare Fund contribution from Booking #${booking.id} (Receipt ${booking.finalReceipt?.receiptNo || 'RCT'})`,
    date: new Date().toISOString()
  };
  store.welfareTransactions.unshift(welfareTx);

  res.json({ success: true, message: 'Payment recorded and job completed!', booking });
});

// 11. Get Bookings
app.get('/api/bookings', (req, res) => {
  const { workerId, customerId } = req.query;
  let results = store.bookings;
  if (workerId) {
    results = results.filter(b => b.workerId === workerId);
  }
  if (customerId) {
    results = results.filter(b => b.customerId === customerId);
  }
  res.json(results);
});

// 12A. Customer Rates Worker
app.post('/api/ratings', (req, res) => {
  const { bookingId, workerId, rating, feedback } = req.body;
  const numRating = parseInt(rating) || 5;

  const booking = store.bookings.find(b => b.id === bookingId);
  if (booking) {
    booking.workerRating = numRating;
    booking.workerFeedback = feedback || '';
  }

  const worker = store.workers.find(w => w.id === workerId);
  if (worker) {
    const currentTotal = worker.rating * (worker.jobsCompleted || 1);
    worker.rating = parseFloat(((currentTotal + numRating) / ((worker.jobsCompleted || 1) + 1)).toFixed(2));
  }
  res.json({ success: true, message: 'Worker rating submitted successfully' });
});

// 12B. Worker Rates Customer (Mutual Rating System)
app.post('/api/ratings/customer', (req, res) => {
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

  res.json({ success: true, message: 'Customer rating submitted successfully', booking });
});

// 13. File Complaint
app.post('/api/complaints', (req, res) => {
  const { bookingId, reportedBy, complainantName, issue } = req.body;
  const newComplaint = {
    id: `CMP-${Math.floor(800 + Math.random() * 200)}`,
    bookingId: bookingId || 'BK-1001',
    reportedBy: reportedBy || 'CUSTOMER',
    complainantName: complainantName || 'Aarav Sharma',
    issue: issue || 'Service delay dispute',
    status: 'OPEN',
    coopNotes: 'Under review by Cooperative Admin committee',
    createdAt: new Date().toISOString()
  };
  store.complaints.unshift(newComplaint);
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
app.post('/api/complaints', (req, res) => {
  const { bookingId, customerName, customerPhone, description } = req.body;
  if (!description) {
    return res.status(400).json({ error: 'Description is required' });
  }
  const complaint = {
    id: `cmp-${Math.floor(1000 + Math.random() * 9000)}`,
    bookingId: bookingId || 'N/A',
    customerName: customerName || 'Customer',
    customerPhone: customerPhone || 'N/A',
    description,
    status: 'OPEN',
    createdAt: new Date().toISOString()
  };
  if (!store.complaints) store.complaints = [];
  store.complaints.unshift(complaint);
  res.status(201).json({ success: true, complaint });
});

// 18. Get all Complaints (for cooperative admin)
app.get('/api/complaints', (req, res) => {
  res.json(store.complaints || []);
});

// 19. Resolve Complaint
app.post('/api/complaints/resolve', (req, res) => {
  const { complaintId, notes } = req.body;
  const complaint = (store.complaints || []).find(c => c.id === complaintId);
  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }
  complaint.status = 'RESOLVED';
  complaint.coopNotes = notes || 'Resolved by Cooperative Committee';
  complaint.resolvedAt = new Date().toISOString();
  res.json({ success: true, complaint });
});

// Start Express Server
app.listen(PORT, () => {
  console.log(`Sahkaar / SevaSetu Core Backend server listening on port ${PORT}`);
});
