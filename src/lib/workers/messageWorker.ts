import { Worker, Job } from 'bullmq';
import redis from '@/lib/redis';
import { connectDB } from '@/lib/db';
import { InboundMessageJob } from '@/types';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import Contact from '@/models/Contact';
import { addTranslationJob } from '@/lib/queues/translationQueue';
import { logAction } from '@/lib/audit';
import { Types } from 'mongoose';

let io: any = null;

export function setSocketIO(socketIO: any) {
  io = socketIO;
}

async function processInboundMessage(job: Job<InboundMessageJob>) {
  const {
    tenantId,
    channelConfigId,
    platform,
    externalContactId,
    contactName,
    body,
    mediaUrl,
    mediaType,
    platformMessageId,
    chatId,
    conversationUrn,
    receivedAt,
  } = job.data;

  await connectDB();

  // 1. Upsert contact
  let contact = await Contact.findOneAndUpdate(
    {
      tenantId: new Types.ObjectId(tenantId),
      'externalIds.platform': platform,
      'externalIds.externalContactId': externalContactId,
    },
    {
      $setOnInsert: {
        tenantId: new Types.ObjectId(tenantId),
        name: contactName,
        externalIds: [{ platform, externalContactId }],
      },
    },
    { upsert: true, new: true }
  );

  // 2. Upsert conversation
  const conversation = await Conversation.findOneAndUpdate(
    {
      tenantId: new Types.ObjectId(tenantId),
      externalContactId,
      platform,
    },
    {
      $set: {
        contactName,
        lastMessageAt: new Date(receivedAt),
        channelConfigId: new Types.ObjectId(channelConfigId),
        contactId: contact._id,
        ...(chatId ? { chatId } : {}),
        ...(conversationUrn ? { conversationUrn } : {}),
      },
      $setOnInsert: {
        status: 'open',
        autoTranslateOutbound: false,
      },
    },
    { upsert: true, new: true }
  );

  // 3. Create message
  const message = await Message.create({
    conversationId: conversation._id,
    tenantId: new Types.ObjectId(tenantId),
    sender: 'customer',
    body: body || '',
    mediaUrl,
    mediaType,
    platformMessageId,
    sentAt: new Date(receivedAt),
    isRead: false,
  });

  // 4. Update conversation lastMessageAt
  await Conversation.updateOne(
    { _id: conversation._id },
    { $set: { lastMessageAt: new Date(receivedAt) } }
  );

  // 5. Enqueue translation job
  await addTranslationJob({
    messageId: message._id.toString(),
    tenantId,
    conversationId: conversation._id.toString(),
    body: body || '',
  });

  // 6. Emit realtime event
  if (io) {
    io.to(`tenant:${tenantId}`).emit('new-message', {
      conversationId: conversation._id.toString(),
      message: {
        _id: message._id,
        sender: 'customer',
        body: body || '',
        mediaUrl,
        mediaType,
        sentAt: message.sentAt,
        isRead: false,
      },
      conversation: {
        _id: conversation._id,
        contactName,
        platform,
        status: conversation.status,
        lastMessageAt: new Date(receivedAt),
      },
    });
  }
}

export function createMessageWorker() {
  const worker = new Worker<InboundMessageJob>(
    'inbound-messages',
    async (job) => {
      await processInboundMessage(job);
    },
    {
      connection: redis,
      concurrency: 20,
    }
  );

  worker.on('failed', async (job, err) => {
    if (job) {
      console.error(`[MessageWorker] Job ${job.id} failed:`, err.message);
      await logAction(
        job.data.tenantId,
        null,
        'message.processing_failed',
        'message',
        job.data.platformMessageId,
        { error: err.message, platform: job.data.platform }
      );
    }
  });

  console.log('[MessageWorker] Started');
  return worker;
}
