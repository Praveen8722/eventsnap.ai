import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    subject: { type: String, required: true },
    requester: { type: String, required: true },
    requesterType: { type: String, enum: ['photographer', 'client'], required: true },
    category: { type: String, default: '' },
    priority: { type: String, enum: ['critical', 'high', 'medium', 'low'], required: true },
    status: { type: String, enum: ['open', 'in-progress', 'resolved', 'closed'], required: true },
    assignedTo: { type: String, default: 'Unassigned' },
    created: { type: Date, required: true },
    updated: { type: Date, required: true },
    messages: { type: Number, default: 0, min: 0 },
  },
  { versionKey: false },
);

supportTicketSchema.index({ created: -1 });

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
