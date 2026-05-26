import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI;

    // 🔥 Safety check (prevents undefined crash)
    if (!uri) {
      console.error("❌ MONGO_URI is not defined in .env file");
      process.exit(1);
    }

    // ✅ Connect to MongoDB
    const conn = await mongoose.connect(uri);

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);

  } catch (error) {
    console.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};