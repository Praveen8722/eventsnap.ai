import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    photographer: { type: String, default: '' },
    bookings: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    lastBooking: { type: String, default: null },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    joinDate: { type: String, required: true },
  },
  { versionKey: false },
);

export const Client = mongoose.model('Client', clientSchema);
