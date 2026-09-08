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

  // No fake/hardcoded users are seeded.
  // Workers and customers are created exclusively through live registrations
  // and stored in MongoDB (see server.js registration endpoint).
  await User.insertMany([]);

  // No demo bookings are seeded. All bookings are created through live user activity.

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
