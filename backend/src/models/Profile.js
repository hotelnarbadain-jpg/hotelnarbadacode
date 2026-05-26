import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    officialHotelName: { type: String, required: true },
    physicalAddress: String,
    primaryContactNo: String,
    panVatNumber: String,
    welcomeMessage: String,
    email: String,
    logo: String,
  },
  { timestamps: true }
);

export default mongoose.model('Profile', profileSchema);
