import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Conversation } from "@/models/Conversation";
import { Message } from "@/models/Message";
import { User } from "@/models/User";
import { withTenant } from "@/lib/tenant";
import redis from "@/lib/redis";

const CACHE_TTL = 300;

export const GET = withTenant(async (_req: NextRequest, { tenantId }) => {
  const cacheKey = `analytics:agents:${tenantId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return NextResponse.json(JSON.parse(cached), { headers: { "X-Cache": "HIT" } });
  }

  await connectDB();
  const tenantOid = new Types.ObjectId(tenantId);

  const [agentStats, agents] = await Promise.all([
    Conversation.aggregate([
      {
        $match: {
          tenantId: tenantOid,
          assignedAgentId: { $exists: true },
        },
      },
      {
        $group: {
          _id: "$assignedAgentId",
          total: { $sum: 1 },
          resolved: {
            $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
          },
        },
      },
    ]),

    // Per-agent avg first response time
    Message.aggregate([
      {
        $match: {
          tenantId: tenantOid,
          sender: "agent",
          agentId: { $exists: true },
        },
      },
      {
        $group: {
          _id: { conversationId: "$conversationId", agentId: "$agentId" },
          firstAgentAt: { $min: "$sentAt" },
        },
      },
      {
        $lookup: {
          from: "conversations",
          localField: "_id.conversationId",
          foreignField: "_id",
          as: "conversation",
        },
      },
      { $unwind: "$conversation" },
      {
        $project: {
          agentId: "$_id.agentId",
          responseMs: {
            $subtract: ["$firstAgentAt", "$conversation.createdAt"],
          },
        },
      },
      {
        $group: {
          _id: "$agentId",
          avgFirstResponseMs: { $avg: "$responseMs" },
        },
      },
    ]),

    User.find({ tenantId: tenantOid, isActive: true }, "name email image").lean(),
  ]);

  // Merge agent stat maps
  const statsMap = new Map(agentStats.map((s) => [s._id.toString(), s]));
  const responseMap = new Map(agents.map((a) => [a._id.toString(), a]));
  const responseTimeMap = new Map(
    (agentStats as unknown as { _id: Types.ObjectId }[]).map((_, i) => {
      const rt = (agents as unknown[])[i];
      return [rt, rt];
    })
  );
  // Build properly from the separate aggregation
  const rtMap = new Map(
    (
      agentStats as unknown as Array<{ _id: Types.ObjectId }>
    ).map((s) => [s._id.toString(), 0])
  );

  // Rebuild correctly from Message aggregate result
  const firstResponseAgg = await Message.aggregate([
    {
      $match: {
        tenantId: tenantOid,
        sender: "agent",
        agentId: { $exists: true },
      },
    },
    {
      $group: {
        _id: { conversationId: "$conversationId", agentId: "$agentId" },
        firstAgentAt: { $min: "$sentAt" },
      },
    },
    {
      $lookup: {
        from: "conversations",
        localField: "_id.conversationId",
        foreignField: "_id",
        as: "conversation",
      },
    },
    { $unwind: "$conversation" },
    {
      $project: {
        agentId: "$_id.agentId",
        responseMs: { $subtract: ["$firstAgentAt", "$conversation.createdAt"] },
      },
    },
    {
      $group: {
        _id: "$agentId",
        avgFirstResponseMs: { $avg: "$responseMs" },
      },
    },
  ]);

  const avgResponseMap = new Map(
    firstResponseAgg.map((r) => [r._id.toString(), r.avgFirstResponseMs as number])
  );

  const agentRows = (agents as Array<{ _id: Types.ObjectId; name: string; email: string; image?: string }>).map((agent) => {
    const id = agent._id.toString();
    const stats = statsMap.get(id);
    const total = stats?.total ?? 0;
    const resolved = stats?.resolved ?? 0;
    const avgFirstResponseMs = avgResponseMap.get(id) ?? 0;

    return {
      agentId: id,
      name: agent.name,
      email: agent.email,
      image: agent.image,
      conversationsHandled: total,
      conversationsResolved: resolved,
      resolutionRate: total > 0 ? Math.round((resolved / total) * 100) : 0,
      avgFirstResponseTimeSeconds: Math.round(avgFirstResponseMs / 1000),
    };
  });

  const result = { agents: agentRows };
  await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));

  return NextResponse.json(result, { headers: { "X-Cache": "MISS" } });
});
