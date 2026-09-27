import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Message from '@/models/Message';
import Conversation from '@/models/Conversation';
import { withTenant } from '@/lib/tenant';
import redis from '@/lib/redis';
import { Types } from 'mongoose';

export const GET = withTenant(async (req, { tenantId }) => {
  const cacheKey = `analytics:overview:${tenantId}`;
  const cached = await redis.get(cacheKey);
  if (cached) return NextResponse.json(JSON.parse(cached));

  await connectDB();
  const tenantObjId = new Types.ObjectId(tenantId);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [openCount, resolvedToday, responseTimes] = await Promise.all([
    Conversation.countDocuments({ tenantId: tenantObjId, status: 'open' }),
    Conversation.countDocuments({
      tenantId: tenantObjId,
      status: 'resolved',
      lastMessageAt: { $gte: todayStart },
    }),
    Message.aggregate([
      {
        $match: {
          tenantId: tenantObjId,
          sender: 'agent',
          sentAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: '$conversationId',
          firstAgentReply: { $min: '$sentAt' },
        },
      },
    ]),
  ]);

  const avgFirstResponseMs =
    responseTimes.length > 0
      ? responseTimes.reduce((sum: number, r: any) => sum + r.firstAgentReply.getTime(), 0) /
        responseTimes.length
      : 0;

  const result = {
    openConversations: openCount,
    resolvedToday,
    avgFirstResponseMinutes: Math.round(avgFirstResponseMs / 60000),
  };

  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  return NextResponse.json(result);
});
