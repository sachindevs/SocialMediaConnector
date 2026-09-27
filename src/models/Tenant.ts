import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITenantDoc extends Document {
  name: string;
  domain: string;
  googleWorkspaceDomain?: string;
  speechmaticsEnabled: boolean;
  speechmaticsApiKey?: string;
  defaultOutboundLang: 'en' | 'auto';
  plan: 'free' | 'pro';
  monthlyCharacterLimit: number;
  currentMonthCharacters: number;
  createdAt: Date;
}

const TenantSchema = new Schema<ITenantDoc>(
  {
    name: { type: String, required: true },
    domain: { type: String, required: true, unique: true },
    googleWorkspaceDomain: { type: String },
    speechmaticsEnabled: { type: Boolean, default: false },
    speechmaticsApiKey: { type: String },
    defaultOutboundLang: { type: String, enum: ['en', 'auto'], default: 'en' },
    plan: { type: String, enum: ['free', 'pro'], default: 'free' },
    monthlyCharacterLimit: { type: Number, default: 100000 },
    currentMonthCharacters: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Tenant: Model<ITenantDoc> =
  mongoose.models.Tenant || mongoose.model<ITenantDoc>('Tenant', TenantSchema);

export default Tenant;
