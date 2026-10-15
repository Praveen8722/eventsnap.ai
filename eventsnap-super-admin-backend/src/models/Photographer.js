import mongoose from 'mongoose';

export const PLAN_NAMES = ['Starter', 'Professional', 'Studio'];

const photographerSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: '' },
    location: { type: String, default: '' },
    joinDate: { type: String, required: true },
    plan: { type: String, enum: PLAN_NAMES, required: true },
    status: { type: String, enum: ['active', 'pending', 'suspended'], default: 'pending' },
    bookings: { type: Number, default: 0, min: 0 },
    revenue: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    specialty: { type: String, default: '' },
    storage: {
      usedGB: { type: Number, default: 0, min: 0 },
      galleries: { type: Number, default: 0, min: 0 },
      files: { type: Number, default: 0, min: 0 },
      lastUpload: { type: String, default: null },
    },
  },
  { versionKey: false },
);

photographerSchema.index({ status: 1, bookings: -1 });
photographerSchema.index({ email: 1 }, { unique: true });

export const Photographer = mongoose.model('Photographer', photographerSchema);
