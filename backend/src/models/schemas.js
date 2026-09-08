const mongoose = require('mongoose');

// 1. Cooperative Schema
const cooperativeSchema = new mongoose.Schema({
  coopId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  registrationNo: { type: String, required: true },
  district: { type: String, required: true },
  state: { type: String, required: true },
  address: { type: String, required: true },
  totalWorkers: { type: Number, default: 0 },
  activeJobs: { type: Number, default: 0 },
  welfareBalance: { type: Number, default: 0 },
  rating: { type: Number, default: 4.8 },
  contactPerson: { type: String },
  phone: { type: String }
}, { timestamps: true });

// 2. User Schema (Customer / Worker / Coop Admin / Ministry)
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  email: { type: String },
  role: { type: String, enum: ['CUSTOMER', 'WORKER', 'COOPERATIVE', 'FEDERATION'], required: true },
  
  // Worker Specific Fields
  coopId: { type: String },
  coopName: { type: String },
  skills: [{ type: String }],
  experienceYears: { type: Number, default: 0 },
  certificates: [{ type: String }],
  photo: { type: String, default: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=200' },
  location: {
    lat: { type: Number, default: 28.6139 },
    lng: { type: Number, default: 77.2090 },
    address: { type: String, default: 'Connaught Place, New Delhi' }
  },
  availability: { type: Boolean, default: true },
  rating: { type: Number, default: 0 },
  jobsCompleted: { type: Number, default: 0 },
  totalEarnings: { type: Number, default: 0 },
  weeklyEarnings: { type: Number, default: 0 },
  verificationStatus: { type: String, enum: ['VERIFIED', 'PENDING_REVIEW', 'REJECTED'], default: 'VERIFIED' },
  gender: { type: String, default: 'Male' },
  welfare: {
    accountNo: { type: String },
    fundBalance: { type: Number, default: 0 },
    insuranceActive: { type: Boolean, default: true },
    insurancePolicyNo: { type: String },
    trainingsCompleted: { type: Number, default: 1 }
  }
}, { timestamps: true });

// 3. Service Schema
const serviceSchema = new mongoose.Schema({
  serviceId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  category: { type: String, required: true },
  basePrice: { type: Number, required: true },
  icon: { type: String, default: 'Wrench' },
  estimatedMin: { type: Number, default: 60 },
  popular: { type: Boolean, default: false }
}, { timestamps: true });

// 4. Booking Schema
const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  customerId: { type: String, required: true },
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  workerId: { type: String, required: true },
  workerName: { type: String, required: true },
  workerPhone: { type: String, required: true },
  coopName: { type: String, required: true },
  serviceId: { type: String, required: true },
  serviceName: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'ASSIGNED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], default: 'ASSIGNED' },
  emergency: { type: Boolean, default: false },
  scheduledTime: { type: Date, default: Date.now },
  address: { type: String, required: true },
  latitude: { type: Number, default: 28.6139 },
  longitude: { type: Number, default: 77.2090 },
  pricing: {
    baseFee: Number,
    serviceTax: Number,
    totalAmount: Number,
    coopPlatformFee: Number,
    welfareContribution: Number,
    workerPayout: Number
  },
  paymentStatus: { type: String, default: 'PAID' },
  paymentMethod: { type: String, default: 'UPI / Online' },
  matchRationale: { type: String }
}, { timestamps: true });

// 5. Welfare Transaction Schema
const welfareTransactionSchema = new mongoose.Schema({
  txId: { type: String, required: true, unique: true },
  workerId: { type: String, required: true },
  workerName: { type: String, required: true },
  type: { type: String, enum: ['CONTRIBUTION', 'STIPEND', 'CLAIM'], required: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true },
  date: { type: Date, default: Date.now }
}, { timestamps: true });

// 6. Complaint Schema
const complaintSchema = new mongoose.Schema({
  complaintId: { type: String, required: true, unique: true },
  bookingId: { type: String, required: true },
  reportedBy: { type: String, enum: ['CUSTOMER', 'WORKER'], required: true },
  complainantName: { type: String, required: true },
  issue: { type: String, required: true },
  status: { type: String, enum: ['OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'REJECTED'], default: 'OPEN' },
  coopNotes: { type: String }
}, { timestamps: true });

// 7. Demand Prediction Schema
const demandPredictionSchema = new mongoose.Schema({
  district: { type: String, required: true },
  service: { type: String, required: true },
  currentWeekJobs: { type: Number, required: true },
  predictedNextWeekJobs: { type: Number, required: true },
  growthPercent: { type: Number, required: true },
  recommendedWorkers: { type: Number, required: true }
}, { timestamps: true });

module.exports = {
  Cooperative: mongoose.model('Cooperative', cooperativeSchema),
  User: mongoose.model('User', userSchema),
  Service: mongoose.model('Service', serviceSchema),
  Booking: mongoose.model('Booking', bookingSchema),
  WelfareTransaction: mongoose.model('WelfareTransaction', welfareTransactionSchema),
  Complaint: mongoose.model('Complaint', complaintSchema),
  DemandPrediction: mongoose.model('DemandPrediction', demandPredictionSchema)
};
