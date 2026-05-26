import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    partyName: { type: String, required: true },
    contactNo: { type: String, required: true },
    panVatNo: String,
    address: { type: String, required: true },
    email: String,
  },
  { timestamps: true }
);

export default mongoose.model('Supplier', supplierSchema);
