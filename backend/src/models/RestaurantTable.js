import mongoose from 'mongoose';

const restaurantTableSchema = new mongoose.Schema(
  {
    number: { type: String, required: true, unique: true },
    capacity: { type: Number, default: 2 },
    status: { type: String, enum: ['Available', 'Occupied', 'Reserved'], default: 'Available' },
  },
  { timestamps: true }
);

export default mongoose.model('RestaurantTable', restaurantTableSchema);
