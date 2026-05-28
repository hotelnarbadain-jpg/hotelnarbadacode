import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Room from '../models/Room.js';

dotenv.config();

const query = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const room219 = await Room.findOne({ roomNo: '219' });
    console.log('Room 219:', JSON.stringify(room219, null, 2));

    const room223 = await Room.findOne({ roomNo: '223' });
    console.log('Room 223:', JSON.stringify(room223, null, 2));

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

query();
