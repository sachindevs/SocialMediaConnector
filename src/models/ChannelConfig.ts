import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IChannelConfigDoc extends Document {
  tenantId: Types.ObjectId;
  platform: 'whatsapp' | 'linkedin' | 'telegram';
  accessToken?: string;
  refreshToken?: string;
  webhookSecret?: string;
  phoneNumberId?: string;
  botUsername?: string;
  botToken?: string;
  linkedinPageUrn?: string;
  chatId?: string;
  isActive: boolean;
  createdAt: Date;
}

const ChannelConfigSchema = new Schema<IChannelConfigDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    platform: { type: String, enum: ['whatsapp', 'linkedin', 'telegram'], required: true },
    accessToken: { type: String },
    refreshToken: { type: String },
    webhookSecret: { type: String },
    phoneNumberId: { type: String },
    botUsername: { type: String },
    botToken: { type: String },
    linkedinPageUrn: { type: String },
    chatId: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ChannelConfigSchema.index({ tenantId: 1, platform: 1 });

const ChannelConfig: Model<IChannelConfigDoc> =
  mongoose.models.ChannelConfig ||
  mongoose.model<IChannelConfigDoc>('ChannelConfig', ChannelConfigSchema);

export default ChannelConfig;
