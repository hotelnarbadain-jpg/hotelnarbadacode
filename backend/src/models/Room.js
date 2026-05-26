import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema(
  {
    roomNo: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    rate: Number,
    status: { type: String, enum: ['Available', 'Occupied', 'Maintenance', 'Dirty', 'Cleaning'], default: 'Available' },
    floor: Number,
  },
  { timestamps: true }
);

export default mongoose.model('Room', roomSchema);
