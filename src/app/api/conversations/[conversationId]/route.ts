import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import { withTenant } from '@/lib/tenant';
import { Types } from 'mongoose';

export const GET = withTenant(async (req, { tenantId }) => {
  const conversationId = req.nextUrl.pathname.split('/')[3];
  await connectDB();

  const conversation = await Conversation.findOne({
    _id: new Types.ObjectId(conversationId),
    tenantId: new Types.ObjectId(tenantId),
  })
    .populate('assignedAgentId', 'name image email')
    .lean();

  if (!conversation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const messages = await Message.find({ conversationId: new Types.ObjectId(conversationId) })
    .sort({ sentAt: -1 })
    .limit(50)
    .populate('agentId', 'name image')
    .lean();

  return NextResponse.json({ conversation, messages: messages.reverse() });
});
