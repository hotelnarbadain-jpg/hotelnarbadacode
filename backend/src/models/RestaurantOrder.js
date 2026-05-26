import mongoose from 'mongoose';

const restaurantOrderSchema = new mongoose.Schema(
  {
    orderType: { type: String, enum: ['Room', 'Table'], default: 'Table' },
    tableId: { type: mongoose.Schema.Types.ObjectId, ref: 'RestaurantTable' },
    tableName: String, // De-normalized for easy access
    guestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest' }, // If charged to room
    guestName: String, // For Normal Person or reference
    items: [
      {
        itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
        name: String,
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
        subtotal: { type: Number, required: true },
      },
    ],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Preparing', 'Served', 'Completed', 'Cancelled'], default: 'Pending' },
    paymentMethod: { type: String, enum: ['Cash', 'Card', 'Online', 'Room Charge', 'Credit'], default: 'Cash' },
  },
  { timestamps: true }
);

export default mongoose.model('RestaurantOrder', restaurantOrderSchema);
