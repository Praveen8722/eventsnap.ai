import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    client: { type: String, required: true },
    photographer: { type: String, required: true },
    eventType: { type: String, required: true },
    eventDate: { type: String, required: true },
    package: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['confirmed', 'in-progress', 'delivered', 'cancelled', 'refunded'], required: true },
    location: { type: String, default: '' },
    createdAt: { type: String, required: true },
  },
  { versionKey: false },
);

bookingSchema.index({ createdAt: -1 });

export const Booking = mongoose.model('Booking', bookingSchema);
