import mongoose from 'mongoose';

const inventoryItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    category: { type: String },
    unit: { type: String, default: 'pcs' },
    stock: { type: Number, default: 0 },
    showInCheckout: { type: Boolean, default: true },
    sellingPrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model('InventoryItem', inventoryItemSchema);
