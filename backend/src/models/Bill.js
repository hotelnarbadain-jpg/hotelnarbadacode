import mongoose from 'mongoose';

const billSchema = new mongoose.Schema(
  {
    billNo: { type: String, required: true, unique: true },
    guestId: { type: mongoose.Schema.Types.ObjectId, ref: 'Guest' },
    guestName: String,
    roomNo: String,
    totalGuests: Number,
    checkIn: Date,
    checkOut: Date,
    contactNo: String,
    rooms: [{
      roomNo: String,
      price: Number,
      total: Number
    }],
    restaurantItems: [{
      item: String,
      qty: Number,
      price: Number,
      total: Number,
      itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' }
    }],
    subTotal: Number,
    discount: Number,
    grandTotal: Number,
    advancePaid: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    totalDue: { type: Number, default: 0 },
    paymentType: String,
    paymentMethod: String,
    date: { type: Date, default: Date.now },
    miti: String,
    deletionStatus: { type: String, enum: ['none', 'Requested'], default: 'none' },
  },
  { timestamps: true }
);

export default mongoose.model('Bill', billSchema);
