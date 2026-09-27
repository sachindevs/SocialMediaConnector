import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import ChannelConfig from '@/models/ChannelConfig';
import { withTenant } from '@/lib/tenant';
import { logAction } from '@/lib/audit';
import { Types } from 'mongoose';
import { decrypt } from '@/lib/encryption';
import * as telegram from '@/lib/platforms/telegram';
import * as whatsapp from '@/lib/platforms/whatsapp';
import * as linkedin from '@/lib/platforms/linkedin';

export const POST = withTenant(async (req, { tenantId, userId }) => {
  const conversationId = req.nextUrl.pathname.split('/')[3];
  await connectDB();

  const { body, isInternal, outboundTranslatedBody, outboundLang } = await req.json();

  if (!body?.trim()) {
    return NextResponse.json({ error: 'Message body is required' }, { status: 400 });
  }

  const conversation = await Conversation.findOne({
    _id: new Types.ObjectId(conversationId),
    tenantId: new Types.ObjectId(tenantId),
  });

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Internal notes skip platform send
  if (!isInternal) {
    const channelConfig = await ChannelConfig.findById(conversation.channelConfigId);
    if (!channelConfig) {
      return NextResponse.json({ error: 'Channel config not found' }, { status: 400 });
    }

    const textToSend = outboundTranslatedBody || body;
    const accessToken = channelConfig.accessToken ? decrypt(channelConfig.accessToken) : '';

    try {
      if (conversation.platform === 'telegram') {
        const chatId = (conversation as any).chatId || conversation.externalContactId;
        const botToken = channelConfig.botToken ? decrypt(channelConfig.botToken) : accessToken;
        await telegram.sendMessage(botToken, chatId, textToSend);
      } else if (conversation.platform === 'whatsapp') {
        await whatsapp.sendMessage(
          accessToken,
          channelConfig.phoneNumberId!,
          conversation.externalContactId,
          textToSend
        );
      } else if (conversation.platform === 'linkedin') {
        const conversationUrn = (conversation as any).conversationUrn;
        await linkedin.sendMessage(accessToken, conversationUrn, textToSend);
      }
    } catch (err: any) {
      return NextResponse.json(
        { error: `Failed to send message: ${err.message}` },
        { status: 502 }
      );
    }
  }

  const message = await Message.create({
    conversationId: conversation._id,
    tenantId: new Types.ObjectId(tenantId),
    sender: 'agent',
    agentId: new Types.ObjectId(userId),
    body,
    outboundTranslatedBody,
    outboundLang: outboundLang || 'en',
    isInternal: !!isInternal,
    sentAt: new Date(),
  });

  await Conversation.updateOne(
    { _id: conversation._id },
    { lastMessageAt: new Date(), status: 'open' }
  );

  await logAction(tenantId, userId, 'message.sent', 'conversation', conversationId);

  return NextResponse.json({ message });
});
