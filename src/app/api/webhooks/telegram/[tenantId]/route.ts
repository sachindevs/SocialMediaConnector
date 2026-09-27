import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import ChannelConfig from '@/models/ChannelConfig';
import { addInboundMessage } from '@/lib/queues/messageQueue';

export async function POST(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const { tenantId } = params;

  // Verify secret token
  const secretToken = req.headers.get('x-telegram-bot-api-secret-token');
  if (!secretToken) {
    return NextResponse.json({ error: 'Missing secret token' }, { status: 401 });
  }

  await connectDB();
  const channelConfig = await ChannelConfig.findOne({
    tenantId,
    platform: 'telegram',
    isActive: true,
  });

  if (!channelConfig || channelConfig.webhookSecret !== secretToken) {
    return NextResponse.json({ error: 'Invalid secret token' }, { status: 401 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const message = body?.message;
  if (!message) {
    return NextResponse.json({ ok: true }); // ignore non-message updates
  }

  const text =
    message.text ||
    message.caption ||
    (message.photo ? '[Photo]' : '') ||
    (message.document ? `[Document: ${message.document.file_name || 'file'}]` : '') ||
    '[Message]';

  const mediaUrl =
    message.photo
      ? message.photo[message.photo.length - 1]?.file_id
      : message.document?.file_id;
  const mediaType = message.photo ? 'image' : message.document ? 'document' : undefined;

  await addInboundMessage({
    tenantId,
    channelConfigId: channelConfig._id.toString(),
    platform: 'telegram',
    externalContactId: String(message.from.id),
    contactName: `${message.from.first_name || ''}${message.from.last_name ? ' ' + message.from.last_name : ''}`.trim(),
    body: text,
    mediaUrl,
    mediaType,
    platformMessageId: String(message.message_id),
    chatId: String(message.chat.id),
    receivedAt: new Date(message.date * 1000).toISOString(),
  });

  return NextResponse.json({ ok: true });
}
