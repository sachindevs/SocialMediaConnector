import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ICannedResponseDoc extends Document {
  tenantId: Types.ObjectId;
  title: string;
  body: string;
  shortcut?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

const CannedResponseSchema = new Schema<ICannedResponseDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    title: { type: String, required: true },
    body: { type: String, required: true },
    shortcut: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

CannedResponseSchema.index({ tenantId: 1, title: 'text', shortcut: 'text' });

const CannedResponse: Model<ICannedResponseDoc> =
  mongoose.models.CannedResponse ||
  mongoose.model<ICannedResponseDoc>('CannedResponse', CannedResponseSchema);

export default CannedResponse;
