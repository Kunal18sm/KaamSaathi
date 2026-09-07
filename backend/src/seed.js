require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./db/connect');
const { Cooperative, User, Service, Booking, WelfareTransaction, Complaint, DemandPrediction } = require('./models/schemas');

const seedData = async () => {
  const isConnected = await connectDB();
  if (!isConnected) {
    console.error('Database connection failed. Seeding aborted.');
    process.exit(1);
  }

  console.log('Clearing existing collections in MongoDB Atlas...');
  await Cooperative.deleteMany({});
  await User.deleteMany({});
  await Service.deleteMany({});
  await Booking.deleteMany({});
  await WelfareTransaction.deleteMany({});
  await Complaint.deleteMany({});
  await DemandPrediction.deleteMany({});

  console.log('Seeding Cooperatives...');
  await Cooperative.insertMany([
    {
      coopId: 'coop-1',
      name: 'Delhi Shramik Swavalamban Cooperative Society',
      registrationNo: 'MSCS/CR/2021/849',
      district: 'Central Delhi',
      state: 'Delhi',
      address: 'Connaught Place, New Delhi',
      totalWorkers: 142,
      activeJobs: 18,
      welfareBalance: 148500,
      rating: 4.8,
      contactPerson: 'Suresh Chandra Sharma',
      phone: '+91 98765 43210'
    },
    {
      coopId: 'coop-2',
      name: 'South Delhi Skill & Artisan Labour Cooperative',
      registrationNo: 'MSCS/CR/2022/1102',
      district: 'South Delhi',
      state: 'Delhi',
      address: 'Hauz Khas, New Delhi',
      totalWorkers: 98,
      activeJobs: 12,
      welfareBalance: 96200,
      rating: 4.7,
      contactPerson: 'Anita Verma',
      phone: '+91 98112 34567'
    },
    {
      coopId: 'coop-3',
      name: 'NCR Household Technicians Cooperative',
      registrationNo: 'MSCS/CR/2023/1540',
      district: 'Noida',
      state: 'Uttar Pradesh',
      address: 'Sector 62, Noida',
      totalWorkers: 115,
      activeJobs: 22,
      welfareBalance: 112000,
      rating: 4.9,
      contactPerson: 'Rajesh Tyagi',
      phone: '+91 99554 12345'
    }
  ]);

  console.log('Seeding Services...');
  await Service.insertMany([
    { serviceId: 'srv-1', name: 'Plumbing', category: 'Household', basePrice: 450, icon: 'Wrench', estimatedMin: 60, popular: true },
    { serviceId: 'srv-2', name: 'Electrical Repair', category: 'Household', basePrice: 400, icon: 'Zap', estimatedMin: 45, popular: true },
    { serviceId: 'srv-3', name: 'Carpentry', category: 'Household', basePrice: 500, icon: 'Hammer', estimatedMin: 90, popular: false },
    { serviceId: 'srv-4', name: 'House Painting', category: 'Renovation', basePrice: 1200, icon: 'Paintbrush', estimatedMin: 240, popular: false },
    { serviceId: 'srv-5', name: 'Deep Cleaning', category: 'Sanitation', basePrice: 650, icon: 'Sparkles', estimatedMin: 120, popular: true },
    { serviceId: 'srv-6', name: 'Gardening & Lawn', category: 'Outdoor', basePrice: 350, icon: 'Trees', estimatedMin: 60, popular: false },
    { serviceId: 'srv-7', name: 'AC Service & Repair', category: 'Appliance', basePrice: 700, icon: 'Wind', estimatedMin: 75, popular: true },
    { serviceId: 'srv-8', name: 'Elderly Caregiver', category: 'Care', basePrice: 800, icon: 'Heart', estimatedMin: 360, popular: false }
  ]);

  console.log('Seeding Users (Workers & Customers)...');
  await User.insertMany([
    {
      userId: 'wrk-1',
      name: 'Ramesh Kumar',
      phone: '+91 98101 11223',
      role: 'WORKER',
      photo: 'https://images.unsplash.com/photo-1540569014015-19a7be504e3a?auto=format&fit=crop&q=80&w=200',
      coopId: 'coop-1',
      coopName: 'Delhi Shramik Swavalamban Cooperative Society',
      skills: ['Plumbing', 'AC Service & Repair'],
      experienceYears: 6,
      certificates: ['ITI Plumbing Certification (2018)', 'Skill India Certified'],
      location: { lat: 28.6139, lng: 77.2090, address: 'Connaught Place, New Delhi' },
      availability: true,
      rating: 4.8,
      jobsCompleted: 124,
      totalEarnings: 68400,
      weeklyEarnings: 1800,
      verificationStatus: 'VERIFIED',
      gender: 'Male',
      welfare: {
        accountNo: 'WEL-DEL-1042',
        fundBalance: 3420,
        insuranceActive: true,
        insurancePolicyNo: 'PMJJBY-882194',
        trainingsCompleted: 3
      }
    },
    {
      userId: 'wrk-2',
      name: 'Sunita Devi',
      phone: '+91 98711 22334',
      role: 'WORKER',
      photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
      coopId: 'coop-2',
      coopName: 'South Delhi Skill & Artisan Labour Cooperative',
      skills: ['Deep Cleaning', 'Elderly Caregiver'],
      experienceYears: 4,
      certificates: ['Certified Healthcare Assistant', 'Safety & Hygiene Certificate'],
      location: { lat: 28.5494, lng: 77.2001, address: 'Hauz Khas, New Delhi' },
      availability: true,
      rating: 4.9,
      jobsCompleted: 89,
      totalEarnings: 52000,
      weeklyEarnings: 1200,
      verificationStatus: 'VERIFIED',
      gender: 'Female',
      welfare: {
        accountNo: 'WEL-DEL-2089',
        fundBalance: 2600,
        insuranceActive: true,
        insurancePolicyNo: 'PMSBY-441209',
        trainingsCompleted: 4
      }
    },
    {
      userId: 'wrk-3',
      name: 'Mohammad Imran',
      phone: '+91 99102 33445',
      role: 'WORKER',
      photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
      coopId: 'coop-1',
      coopName: 'Delhi Shramik Swavalamban Cooperative Society',
      skills: ['Electrical Repair', 'AC Service & Repair'],
      experienceYears: 8,
      certificates: ['National Trade Certificate (NTC) Electrical'],
      location: { lat: 28.6250, lng: 77.2180, address: 'Mandi House, New Delhi' },
      availability: true,
      rating: 4.7,
      jobsCompleted: 210,
      totalEarnings: 114000,
      weeklyEarnings: 7400,
      verificationStatus: 'VERIFIED',
      gender: 'Male',
      welfare: {
        accountNo: 'WEL-DEL-1011',
        fundBalance: 5700,
        insuranceActive: true,
        insurancePolicyNo: 'PMJJBY-993012',
        trainingsCompleted: 5
      }
    },
    {
      userId: 'cust-1',
      name: 'Aarav Sharma',
      phone: '+91 98990 12345',
      email: 'aarav.sharma@example.com',
      role: 'CUSTOMER',
      location: { lat: 28.6100, lng: 77.2050, address: 'Barakhamba Road, Connaught Place, New Delhi' }
    }
  ]);

  console.log('Seeding Bookings...');
  await Booking.insertMany([
    {
      bookingId: 'BK-1001',
      customerId: 'cust-1',
      customerName: 'Aarav Sharma',
      customerPhone: '+91 98990 12345',
      workerId: 'wrk-1',
      workerName: 'Ramesh Kumar',
      workerPhone: '+91 98101 11223',
      coopName: 'Delhi Shramik Swavalamban Cooperative Society',
      serviceId: 'srv-1',
      serviceName: 'Plumbing',
      status: 'COMPLETED',
      emergency: false,
      scheduledTime: new Date(),
      address: 'Barakhamba Road, Connaught Place, New Delhi',
      latitude: 28.6100,
      longitude: 77.2050,
      pricing: {
        baseFee: 450,
        serviceTax: 25,
        totalAmount: 475,
        coopPlatformFee: 23.75,
        welfareContribution: 23.75,
        workerPayout: 427.50
      },
      paymentStatus: 'PAID',
      paymentMethod: 'UPI / Online',
      matchRationale: 'Assigned Ramesh because he is qualified, 1.2 km away, 4.8 star rated, and had lower weekly earnings.'
    }
  ]);

  console.log('Seeding Demand Predictions...');
  await DemandPrediction.insertMany([
    { district: 'Central Delhi', service: 'Plumbing', currentWeekJobs: 142, predictedNextWeekJobs: 184, growthPercent: 29.5, recommendedWorkers: 6 },
    { district: 'South Delhi', service: 'Deep Cleaning', currentWeekJobs: 98, predictedNextWeekJobs: 135, growthPercent: 37.7, recommendedWorkers: 8 },
    { district: 'Noida', service: 'AC Service & Repair', currentWeekJobs: 110, predictedNextWeekJobs: 158, growthPercent: 43.6, recommendedWorkers: 10 },
    { district: 'North Delhi', service: 'Electrical Repair', currentWeekJobs: 85, predictedNextWeekJobs: 94, growthPercent: 10.5, recommendedWorkers: 2 }
  ]);

  console.log('MongoDB Seeded Successfully!');
  process.exit(0);
};

seedData();
