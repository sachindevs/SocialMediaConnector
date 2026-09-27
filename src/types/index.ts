import { Types } from 'mongoose';

export interface ITenant {
  _id: Types.ObjectId;
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

export interface IUser {
  _id: Types.ObjectId;
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

export interface IChannelConfig {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  platform: 'whatsapp' | 'linkedin' | 'telegram';
  accessToken?: string;
  refreshToken?: string;
  webhookSecret?: string;
  phoneNumberId?: string;
  botUsername?: string;
  linkedinPageUrn?: string;
  chatId?: string;
  isActive: boolean;
  createdAt: Date;
}

export interface IConversation {
  _id: Types.ObjectId;
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

export interface IMessage {
  _id: Types.ObjectId;
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

export interface IAuditLog {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  userId?: Types.ObjectId;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface IContact {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  name: string;
  avatar?: string;
  externalIds: Array<{ platform: string; externalContactId: string }>;
  notes?: string;
  createdAt: Date;
}

export interface ICannedResponse {
  _id: Types.ObjectId;
  tenantId: Types.ObjectId;
  title: string;
  body: string;
  shortcut?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
}

export interface InboundMessageJob {
  tenantId: string;
  channelConfigId: string;
  platform: 'whatsapp' | 'linkedin' | 'telegram';
  externalContactId: string;
  contactName: string;
  body: string;
  mediaUrl?: string;
  mediaType?: string;
  platformMessageId: string;
  chatId?: string;
  conversationUrn?: string;
  receivedAt: string;
}
