import mongoose from 'mongoose';

export const ADMIN_ROLES = ['Super Admin', 'Platform Admin', 'Support Agent', 'Finance Admin', 'Read Only'];

const adminUserSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    role: { type: String, enum: ADMIN_ROLES, required: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    // Null for invited admins who have not set a password yet; such accounts cannot sign in.
    passwordHash: { type: String, default: null, select: false },
    lastLogin: { type: Date, default: null },
    joined: { type: String, required: true },
    twoFA: { type: Boolean, default: false },
  },
  { versionKey: false },
);

export const AdminUser = mongoose.model('AdminUser', adminUserSchema);

const roleSchema = new mongoose.Schema(
  {
    _id: { type: String, enum: ADMIN_ROLES },
    color: { type: String, required: true },
    bg: { type: String, required: true },
    permissions: { type: [String], default: [] },
    order: { type: Number, default: 0 },
  },
  { versionKey: false },
);

export const Role = mongoose.model('Role', roleSchema);
