const mongoose = require("mongoose");

async function connectDb() {
  const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/splitstream";
  mongoose.set("strictQuery", true);

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(uri);
  return mongoose.connection;
}

module.exports = connectDb;
