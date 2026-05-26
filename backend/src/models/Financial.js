import mongoose from 'mongoose';

const financialSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['Income', 'Expense'], default: 'Income' },
    date: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.model('Financial', financialSchema);
