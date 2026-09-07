const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI;
    if (!connStr) {
      console.log('MONGODB_URI not provided.');
      return false;
    }
    
    // Connect with 5-second timeout to avoid hanging
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 5000
    });
    console.log(`MongoDB Connected successfully: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.warn(`MongoDB Atlas warning (${error.message}). Operating in hybrid storage mode.`);
    return false;
  }
};

module.exports = connectDB;
