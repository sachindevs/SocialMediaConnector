import { Queue } from 'bullmq';
import redis from '@/lib/redis';

interface TranslationJob {
  messageId: string;
  tenantId: string;
  conversationId: string;
  body: string;
}

export const translationQueue = new Queue<TranslationJob>('translation-jobs', {
  connection: redis,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'fixed', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

export async function addTranslationJob(job: TranslationJob): Promise<void> {
  await translationQueue.add('translate', job);
}
