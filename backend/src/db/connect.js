const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
  try {
    // Resolve Node.js SRV DNS lookup issues on Windows
    try {
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch (dnsErr) {
      console.error('DNS server override notice:', dnsErr.message);
    }

    const connStr = process.env.MONGODB_URI;
    if (!connStr) {
      console.log('MONGODB_URI not provided.');
      return false;
    }
    
    // Connect with 10-second timeout
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 10000
    });
    console.log(`MongoDB Atlas Connected Successfully: Host = ${conn.connection.host}, DB = ${conn.connection.name}`);
    return true;
  } catch (error) {
    console.error(`MongoDB Atlas warning (${error.message}). Operating in hybrid storage mode.`);
    return false;
  }
};

module.exports = connectDB;
