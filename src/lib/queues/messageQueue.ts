import { Queue } from 'bullmq';
import redis from '@/lib/redis';
import { InboundMessageJob } from '@/types';

export const messageQueue = new Queue<InboundMessageJob>('inbound-messages', {
  connection: redis,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 200,
  },
});

export async function addInboundMessage(job: InboundMessageJob): Promise<void> {
  await messageQueue.add('process', job, {
    jobId: `${job.platform}-${job.platformMessageId}`,
  });
}
