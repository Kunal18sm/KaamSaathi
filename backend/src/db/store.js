// In-memory data store for Sahkaar / SevaSetu
const { v4: uuidv4 } = require('uuid');

const store = {
  cooperatives: [
    {
      id: 'coop-1',
      name: 'Delhi Shramik Swavalamban Cooperative Society',
      registrationNo: 'MSCS/CR/2021/849',
      district: 'Central Delhi',
      state: 'Delhi',
      address: 'Connaught Place, New Delhi',
      totalWorkers: 0,
      activeJobs: 0,
      welfareBalance: 0,
      rating: 4.8,
      contactPerson: 'Suresh Chandra Sharma',
      phone: '+91 98765 43210'
    },
    {
      id: 'coop-2',
      name: 'South Delhi Skill & Artisan Labour Cooperative',
      registrationNo: 'MSCS/CR/2022/1102',
      district: 'South Delhi',
      state: 'Delhi',
      address: 'Hauz Khas, New Delhi',
      totalWorkers: 0,
      activeJobs: 0,
      welfareBalance: 0,
      rating: 4.7,
      contactPerson: 'Anita Verma',
      phone: '+91 98112 34567'
    },
    {
      id: 'coop-3',
      name: 'NCR Household Technicians Cooperative',
      registrationNo: 'MSCS/CR/2023/1540',
      district: 'Noida',
      state: 'Uttar Pradesh',
      address: 'Sector 62, Noida',
      totalWorkers: 0,
      activeJobs: 0,
      welfareBalance: 0,
      rating: 4.9,
      contactPerson: 'Rajesh Tyagi',
      phone: '+91 99554 12345'
    }
  ],

  services: [
    { id: 'srv-1', name: 'Plumbing', category: 'Household', basePrice: 450, icon: 'Wrench', estimatedMin: 60, popular: true },
    { id: 'srv-2', name: 'Electrical Repair', category: 'Household', basePrice: 400, icon: 'Zap', estimatedMin: 45, popular: true },
    { id: 'srv-3', name: 'Carpentry', category: 'Household', basePrice: 500, icon: 'Hammer', estimatedMin: 90, popular: false },
    { id: 'srv-4', name: 'House Painting', category: 'Renovation', basePrice: 1200, icon: 'Paintbrush', estimatedMin: 240, popular: false },
    { id: 'srv-5', name: 'Deep Cleaning', category: 'Sanitation', basePrice: 650, icon: 'Sparkles', estimatedMin: 120, popular: true },
    { id: 'srv-6', name: 'Gardening & Lawn', category: 'Outdoor', basePrice: 350, icon: 'Trees', estimatedMin: 60, popular: false },
    { id: 'srv-7', name: 'AC Service & Repair', category: 'Appliance', basePrice: 700, icon: 'Wind', estimatedMin: 75, popular: true },
    { id: 'srv-8', name: 'Elderly Caregiver', category: 'Care', basePrice: 800, icon: 'Heart', estimatedMin: 360, popular: false }
  ],

  // Workers are loaded exclusively from MongoDB (see server.js).
  // No hardcoded/demo worker data is bundled in this in-memory store.
  workers: [],
  customers: [],
  bookings: [],
  welfareTransactions: [],
  complaints: [],
  demandPredictions: [
    { district: 'Central Delhi', service: 'Plumbing', currentWeekJobs: 14, predictedNextWeekJobs: 22, growthPercent: 57.1, recommendedWorkers: 2 },
    { district: 'South Delhi', service: 'Deep Cleaning', currentWeekJobs: 10, predictedNextWeekJobs: 18, growthPercent: 80.0, recommendedWorkers: 2 },
    { district: 'Noida', service: 'AC Service & Repair', currentWeekJobs: 12, predictedNextWeekJobs: 20, growthPercent: 66.7, recommendedWorkers: 2 }
  ]
};

module.exports = store;
