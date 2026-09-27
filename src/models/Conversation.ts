import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IConversationDoc extends Document {
  tenantId: Types.ObjectId;
  channelConfigId: Types.ObjectId;
  platform: 'whatsapp' | 'linkedin' | 'telegram';
  externalContactId: string;
  contactId?: Types.ObjectId;
  contactName: string;
  contactAvatar?: string;
  status: 'open' | 'pending' | 'resolved';
  assignedAgentId?: Types.ObjectId;
  customerLanguage?: string;
  autoTranslateOutbound: boolean;
  lastMessageAt: Date;
  slaBreachedAt?: Date;
  createdAt: Date;
}

const ConversationSchema = new Schema<IConversationDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
    channelConfigId: { type: Schema.Types.ObjectId, ref: 'ChannelConfig', required: true },
    platform: { type: String, enum: ['whatsapp', 'linkedin', 'telegram'], required: true },
    externalContactId: { type: String, required: true },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact' },
    contactName: { type: String, required: true },
    contactAvatar: { type: String },
    status: { type: String, enum: ['open', 'pending', 'resolved'], default: 'open' },
    assignedAgentId: { type: Schema.Types.ObjectId, ref: 'User' },
    customerLanguage: { type: String },
    autoTranslateOutbound: { type: Boolean, default: false },
    lastMessageAt: { type: Date, default: Date.now },
    slaBreachedAt: { type: Date },
  },
  { timestamps: true }
);

ConversationSchema.index({ tenantId: 1, status: 1, lastMessageAt: -1 });
ConversationSchema.index({ tenantId: 1, externalContactId: 1, platform: 1 });

const Conversation: Model<IConversationDoc> =
  mongoose.models.Conversation ||
  mongoose.model<IConversationDoc>('Conversation', ConversationSchema);

export default Conversation;
