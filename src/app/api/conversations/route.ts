import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Conversation from '@/models/Conversation';
import { withTenant } from '@/lib/tenant';
import { Types } from 'mongoose';

export const GET = withTenant(async (req, { tenantId }) => {
  await connectDB();

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status');
  const platform = searchParams.get('platform');
  const assignedAgentId = searchParams.get('assignedAgentId');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '25');
  const skip = (page - 1) * limit;

  const filter: Record<string, unknown> = { tenantId: new Types.ObjectId(tenantId) };
  if (status) filter.status = status;
  if (platform) filter.platform = platform;
  if (assignedAgentId) filter.assignedAgentId = new Types.ObjectId(assignedAgentId);

  const [conversations, total] = await Promise.all([
    Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedAgentId', 'name image email')
      .lean(),
    Conversation.countDocuments(filter),
  ]);

  return NextResponse.json({
    conversations,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
});
