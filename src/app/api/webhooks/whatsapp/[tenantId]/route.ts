import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import ChannelConfig from '@/models/ChannelConfig';
import { addInboundMessage } from '@/lib/queues/messageQueue';

function verifySignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

// GET — webhook verification challenge
export async function GET(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const { tenantId } = params;
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode !== 'subscribe') {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 });
  }

  await connectDB();
  const channelConfig = await ChannelConfig.findOne({
    tenantId,
    platform: 'whatsapp',
    isActive: true,
  });

  if (!channelConfig || channelConfig.webhookSecret !== token) {
    return NextResponse.json({ error: 'Invalid verify token' }, { status: 403 });
  }

  return new NextResponse(challenge, { status: 200 });
}

// POST — inbound messages
export async function POST(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
) {
  const { tenantId } = params;
  const rawBody = await req.text();
  const signature = req.headers.get('x-hub-signature-256') || '';

  await connectDB();
  const channelConfig = await ChannelConfig.findOne({
    tenantId,
    platform: 'whatsapp',
    isActive: true,
  });

  if (!channelConfig || !channelConfig.webhookSecret) {
    return NextResponse.json({ error: 'Channel not configured' }, { status: 400 });
  }

  if (!verifySignature(rawBody, signature, channelConfig.webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const entry = payload?.entry?.[0];
  const change = entry?.changes?.[0];
  const value = change?.value;
  const messages = value?.messages;

  if (!messages || messages.length === 0) {
    return NextResponse.json({ ok: true }); // status update, not a message
  }

  for (const msg of messages) {
    const contact = value.contacts?.find((c: any) => c.wa_id === msg.from);
    const contactName = contact?.profile?.name || msg.from;

    let body = '';
    let mediaUrl: string | undefined;
    let mediaType: string | undefined;

    if (msg.type === 'text') {
      body = msg.text?.body || '';
    } else if (msg.type === 'image') {
      body = msg.image?.caption || '[Image]';
      mediaUrl = msg.image?.id;
      mediaType = 'image';
    } else if (msg.type === 'document') {
      body = msg.document?.filename || '[Document]';
      mediaUrl = msg.document?.id;
      mediaType = 'document';
    } else if (msg.type === 'audio') {
      body = '[Audio]';
      mediaUrl = msg.audio?.id;
      mediaType = 'audio';
    } else {
      body = `[${msg.type}]`;
    }

    await addInboundMessage({
      tenantId,
      channelConfigId: channelConfig._id.toString(),
      platform: 'whatsapp',
      externalContactId: msg.from,
      contactName,
      body,
      mediaUrl,
      mediaType,
      platformMessageId: msg.id,
      receivedAt: new Date(parseInt(msg.timestamp) * 1000).toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}
