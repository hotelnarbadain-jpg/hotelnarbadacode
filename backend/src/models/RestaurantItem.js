import mongoose from 'mongoose';

const restaurantItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true },
    price: Number,
    stock: Number,
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('RestaurantItem', restaurantItemSchema);
