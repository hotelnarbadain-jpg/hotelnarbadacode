import mongoose from 'mongoose';

const purchaseItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem' },
    description: { type: String, required: true },
    qty: { type: Number, default: 1 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const purchaseSchema = new mongoose.Schema(
  {
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    invoiceNo: { type: String, required: true },
    date: { type: Date, default: Date.now },
    paymentMethod: { type: String, enum: ['CASH', 'CARD', 'BANK', 'CREDIT'], default: 'CASH' },
    paidAmount: { type: Number, default: 0 },
    remarks: String,
    items: { type: [purchaseItemSchema], default: [] },
    totalAmount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('Purchase', purchaseSchema);
