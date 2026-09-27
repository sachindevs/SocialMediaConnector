import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IContactDoc extends Document {
  tenantId: Types.ObjectId;
  name: string;
  avatar?: string;
  externalIds: Array<{ platform: string; externalContactId: string }>;
  notes?: string;
  createdAt: Date;
}

const ContactSchema = new Schema<IContactDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    name: { type: String, required: true },
    avatar: { type: String },
    externalIds: [
      {
        platform: { type: String, required: true },
        externalContactId: { type: String, required: true },
      },
    ],
    notes: { type: String },
  },
  { timestamps: true }
);

ContactSchema.index({ tenantId: 1 });

const Contact: Model<IContactDoc> =
  mongoose.models.Contact || mongoose.model<IContactDoc>('Contact', ContactSchema);

export default Contact;
