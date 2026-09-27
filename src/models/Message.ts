import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IMessageDoc extends Document {
  conversationId: Types.ObjectId;
  tenantId: Types.ObjectId;
  sender: 'customer' | 'agent';
  agentId?: Types.ObjectId;
  body: string;
  bodyTranslated?: string;
  detectedLanguage?: string;
  translationConfidence?: number;
  translationApplied: boolean;
  translationFailed: boolean;
  outboundTranslatedBody?: string;
  outboundLang?: 'en' | 'detected' | 'auto';
  mediaUrl?: string;
  mediaType?: string;
  platformMessageId?: string;
  isRead: boolean;
  isInternal: boolean;
  sentAt: Date;
}

const MessageSchema = new Schema<IMessageDoc>({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true },
  tenantId: { type: Schema.Types.ObjectId, ref: 'Tenant', required: true },
  sender: { type: String, enum: ['customer', 'agent'], required: true },
  agentId: { type: Schema.Types.ObjectId, ref: 'User' },
  body: { type: String, required: true },
  bodyTranslated: { type: String },
  detectedLanguage: { type: String },
  translationConfidence: { type: Number },
  translationApplied: { type: Boolean, default: false },
  translationFailed: { type: Boolean, default: false },
  outboundTranslatedBody: { type: String },
  outboundLang: { type: String, enum: ['en', 'detected', 'auto'] },
  mediaUrl: { type: String },
  mediaType: { type: String },
  platformMessageId: { type: String },
  isRead: { type: Boolean, default: false },
  isInternal: { type: Boolean, default: false },
  sentAt: { type: Date, default: Date.now },
});

MessageSchema.index({ conversationId: 1, sentAt: 1 });
MessageSchema.index({ tenantId: 1, sentAt: -1 });

const Message: Model<IMessageDoc> =
  mongoose.models.Message || mongoose.model<IMessageDoc>('Message', MessageSchema);

export default Message;
