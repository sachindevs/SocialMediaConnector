import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Message from '@/models/Message';
import { withTenant } from '@/lib/tenant';
import redis from '@/lib/redis';
import { Types } from 'mongoose';

export const GET = withTenant(async (req, { tenantId }) => {
  const { searchParams } = req.nextUrl;
  const from = searchParams.get('from') || new Date(Date.now() - 30 * 86400000).toISOString();
  const to = searchParams.get('to') || new Date().toISOString();

  const cacheKey = `analytics:languages:${tenantId}:${from}:${to}`;
  const cached = await redis.get(cacheKey);
  if (cached) return NextResponse.json(JSON.parse(cached));

  await connectDB();

  const result = await Message.aggregate([
    {
      $match: {
        tenantId: new Types.ObjectId(tenantId),
        translationApplied: true,
        detectedLanguage: { $exists: true, $ne: null },
        sentAt: { $gte: new Date(from), $lte: new Date(to) },
      },
    },
    { $group: { _id: '$detectedLanguage', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
    { $project: { language: '$_id', count: 1, _id: 0 } },
  ]);

  await redis.set(cacheKey, JSON.stringify(result), 'EX', 300);
  return NextResponse.json(result);
});
