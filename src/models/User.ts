import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IUserDoc extends Document {
  tenantId: Types.ObjectId;
  email: string;
  name: string;
  image?: string;
  googleId?: string;
  role: 'admin' | 'agent' | 'supervisor';
  isActive: boolean;
  pushSubscription?: object;
  createdAt: Date;
}

const UserSchema = new Schema<IUserDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    email: { type: String, required: true },
    name: { type: String, required: true },
    image: { type: String },
    googleId: { type: String },
    role: { type: String, enum: ['admin', 'agent', 'supervisor'], default: 'agent' },
    isActive: { type: Boolean, default: true },
    pushSubscription: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

UserSchema.index({ tenantId: 1, email: 1 }, { unique: true });

const User: Model<IUserDoc> =
  mongoose.models.User || mongoose.model<IUserDoc>('User', UserSchema);

export default User;
