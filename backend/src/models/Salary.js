import mongoose from 'mongoose';

const salarySchema = new mongoose.Schema(
  {
    staff: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    baseSalary: { type: Number, required: true },
    overtime: { type: Number, default: 0 },
    bonus: { type: Number, default: 0 },
    advance: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    month: { type: String, required: true },
    year: { type: String, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Paid', 'Hold'],
      default: 'Pending',
    },
    paymentMethod: String,
    paymentDate: String,
    remarks: String,
  },
  { timestamps: true }
);

export default mongoose.model('Salary', salarySchema);
