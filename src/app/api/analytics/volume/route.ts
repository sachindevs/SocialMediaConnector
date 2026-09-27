import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Message } from "@/models/Message";
import { withTenant } from "@/lib/tenant";
import redis from "@/lib/redis";

const CACHE_TTL = 300;

export const GET = withTenant(async (req: NextRequest, { tenantId }) => {
  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : new Date(Date.now() - 30 * 86400000);
  const to = toParam ? new Date(toParam) : new Date();

  if (isNaN(from.getTime()) || isNaN(to.getTime())) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const cacheKey = `analytics:volume:${tenantId}:${from.toISOString()}:${to.toISOString()}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return NextResponse.json(JSON.parse(cached), { headers: { "X-Cache": "HIT" } });
  }

  await connectDB();
  const tenantOid = new Types.ObjectId(tenantId);

  const volume = await Message.aggregate([
    {
      $match: {
        tenantId: tenantOid,
        sentAt: { $gte: from, $lte: to },
      },
    },
    {
      $lookup: {
        from: "conversations",
        localField: "conversationId",
        foreignField: "_id",
        as: "conversation",
      },
    },
    { $unwind: "$conversation" },
    {
      $group: {
        _id: {
          date: {
            $dateToString: { format: "%Y-%m-%d", date: "$sentAt" },
          },
          platform: "$conversation.platform",
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { "_id.date": 1 } },
    {
      $group: {
        _id: "$_id.date",
        platforms: {
          $push: { platform: "$_id.platform", count: "$count" },
        },
        total: { $sum: "$count" },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const result = { volume, from: from.toISOString(), to: to.toISOString() };
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

  return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
});
