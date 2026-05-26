import mongoose from 'mongoose';

const roomCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    rate: { type: Number, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model('RoomCategory', roomCategorySchema);
