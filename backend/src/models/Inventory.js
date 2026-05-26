import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    supplier: String,
    invoiceNo: String,
    amount: Number,
    date: Date,
    activeSupplier: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('Inventory', inventorySchema);
