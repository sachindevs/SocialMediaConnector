import { Worker, Job } from 'bullmq';
import redis from '@/lib/redis';
import { connectDB } from '@/lib/db';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import Tenant from '@/models/Tenant';
import { detectLanguage, translate, SpeechmaticsError } from '@/lib/speechmatics';
import { circuitBreakerExecute } from '@/lib/circuitBreaker';
import { decrypt } from '@/lib/encryption';
import { Types } from 'mongoose';

interface TranslationJob {
  messageId: string;
  tenantId: string;
  conversationId: string;
  body: string;
}

let io: any = null;

export function setSocketIOForTranslation(socketIO: any) {
  io = socketIO;
}

async function processTranslationJob(job: Job<TranslationJob>) {
  const { messageId, tenantId, conversationId, body } = job.data;

  await connectDB();

  const tenant = await Tenant.findById(tenantId);
  if (!tenant || !tenant.speechmaticsEnabled || !tenant.speechmaticsApiKey) {
    await Message.updateOne({ _id: messageId }, { translationApplied: false });
    return;
  }

  // Check monthly budget cap
  if (tenant.currentMonthCharacters >= tenant.monthlyCharacterLimit) {
    await Message.updateOne(
      { _id: messageId },
      { translationFailed: true, translationApplied: false }
    );
    if (io) {
      io.to(`conv:${conversationId}`).emit('message-translation-failed', {
        messageId,
        reason: 'budget_cap_exceeded',
      });
    }
    return;
  }

  const apiKey = decrypt(tenant.speechmaticsApiKey);

  try {
    // Detect language using circuit breaker
    const detection = await circuitBreakerExecute(tenantId, () =>
      detectLanguage(body, apiKey)
    );

    await Message.updateOne({ _id: messageId }, {
      detectedLanguage: detection.language,
      translationConfidence: detection.confidence,
    });

    // Update conversation customer language
    await Conversation.updateOne(
      { _id: conversationId },
      { customerLanguage: detection.language }
    );

    // If already English, no translation needed
    if (detection.language === 'en') {
      await Message.updateOne({ _id: messageId }, { translationApplied: false });
      if (io) {
        io.to(`conv:${conversationId}`).emit('message-translated', {
          messageId,
          detectedLanguage: 'en',
          translationApplied: false,
        });
      }
      return;
    }

    // Translate to English
    const result = await circuitBreakerExecute(tenantId, () =>
      translate(body, detection.language, 'en', apiKey)
    );

    await Message.updateOne({ _id: messageId }, {
      bodyTranslated: result.translatedText,
      translationApplied: true,
    });

    // Increment character usage
    await Tenant.updateOne(
      { _id: tenantId },
      { $inc: { currentMonthCharacters: body.length } }
    );

    if (io) {
      io.to(`conv:${conversationId}`).emit('message-translated', {
        messageId,
        detectedLanguage: detection.language,
        translationConfidence: detection.confidence,
        bodyTranslated: result.translatedText,
        translationApplied: true,
      });
    }
  } catch (err) {
    console.error('[TranslationWorker] Error:', err);
    await Message.updateOne({ _id: messageId }, { translationFailed: true });
    if (io) {
      io.to(`conv:${conversationId}`).emit('message-translation-failed', {
        messageId,
        reason: err instanceof SpeechmaticsError ? err.message : 'unknown_error',
      });
    }
  }
}

export function createTranslationWorker() {
  const worker = new Worker<TranslationJob>(
    'translation-jobs',
    async (job) => {
      await processTranslationJob(job);
    },
    {
      connection: redis,
      concurrency: 10,
    }
  );

  worker.on('failed', (job, err) => {
    console.error(`[TranslationWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[TranslationWorker] Started');
  return worker;
}
