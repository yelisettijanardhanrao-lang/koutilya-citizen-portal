const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not configured in .env");
  }

  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);

  console.log("✅ MongoDB connected");
}

module.exports = connectDB;
