import mongoose from 'mongoose';

const sahakariSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, default: 'Saving' },
    accountNo: String,
    balance: { type: Number, default: 0 },
    address: { type: String },
    contactPerson: { type: String },
    contactNo: { type: String },
    transactions: [
      {
        date: { type: Date, required: true },
        category: { type: String, required: true },
        type: { type: String, enum: ['Deposit', 'Withdraw'], required: true },
        amount: { type: Number, required: true },
        remarks: { type: String },
        createdAt: { type: Date, default: Date.now }
      }
    ],
  },
  { timestamps: true }
);

export default mongoose.model('Sahakari', sahakariSchema);
