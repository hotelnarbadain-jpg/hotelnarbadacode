import mongoose from 'mongoose';

const shiftSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date },
    openingCash: { type: Number, required: true, default: 0 },
    openingFonepay: { type: Number, required: true, default: 0 },
    closingCash: { type: Number },
    closingFonepay: { type: Number },
    expectedClosingCash: { type: Number },
    expectedClosingFonepay: { type: Number },
    status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
    remarks: { type: String },
    deletionStatus: { type: String, enum: ['none', 'Requested'], default: 'none' },
  },
  { timestamps: true }
);

export default mongoose.model('ShiftSession', shiftSessionSchema);
