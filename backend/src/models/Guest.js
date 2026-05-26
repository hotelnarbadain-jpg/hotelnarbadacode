import mongoose from 'mongoose';

const guestSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    phone: String,
    city: String,
    noOfGuest: { type: Number, default: 1 },
    documentType: String,
    documentNo: String,
    remarks: String,
    rooms: [{
      roomNo: String,
      noOfGuest: { type: Number, default: 1 },
      price: Number
    }],
    roomNo: String,
    price: Number,
    checkInDate: Date,
    checkInTime: String,
    checkOutDate: Date,
    status: { type: String, default: 'Checked In' },
    deletionStatus: { type: String, enum: ['none', 'Requested'], default: 'none' },
    totalDue: { type: Number, default: 0 },
    advancePayment: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Guest', guestSchema);
