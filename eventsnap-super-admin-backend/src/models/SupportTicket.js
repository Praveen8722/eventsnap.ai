import mongoose from 'mongoose';

export const TICKET_PRIORITIES = ['critical', 'high', 'medium', 'low'];
export const TICKET_STATUSES = ['open', 'in-progress', 'resolved', 'closed'];

const messageSchema = new mongoose.Schema(
  {
    // "admin": a reply from the support team. "requester": the photographer's or client's message,
    // logged by an admin (tickets are raised by email, phone or chat outside this panel).
    from: { type: String, enum: ['admin', 'requester'], required: true },
    author: { type: String, required: true },
    body: { type: String, required: true },
    at: { type: Date, default: Date.now },
  },
  { _id: true, versionKey: false },
);

const supportTicketSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    subject: { type: String, required: true },
    requester: { type: String, required: true },
    requesterType: { type: String, enum: ['photographer', 'client'], required: true },
    category: { type: String, default: '' },
    priority: { type: String, enum: TICKET_PRIORITIES, required: true },
    status: { type: String, enum: TICKET_STATUSES, required: true },
    assignedTo: { type: String, default: 'Unassigned' },
    created: { type: Date, required: true },
    updated: { type: Date, required: true },
    thread: { type: [messageSchema], default: [] },
  },
  { versionKey: false },
);

supportTicketSchema.index({ created: -1 });

export const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
