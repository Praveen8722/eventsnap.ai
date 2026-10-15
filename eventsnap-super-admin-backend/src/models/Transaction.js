import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    photographer: { type: String, required: true },
    type: { type: String, enum: ['subscription', 'commission', 'refund'], required: true },
    // Signed amount in dollars: positive for income, negative for refunds.
    amount: { type: Number, required: true },
    method: { type: String, default: '' },
    status: { type: String, enum: ['completed', 'pending', 'failed', 'refunded'], required: true },
    date: { type: String, required: true },
    description: { type: String, default: '' },
  },
  { versionKey: false },
);

transactionSchema.index({ date: -1 });

export const Transaction = mongoose.model('Transaction', transactionSchema);
