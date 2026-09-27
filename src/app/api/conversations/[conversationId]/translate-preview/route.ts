import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Conversation from '@/models/Conversation';
import Tenant from '@/models/Tenant';
import { withTenant } from '@/lib/tenant';
import { translate } from '@/lib/speechmatics';
import { decrypt } from '@/lib/encryption';
import { Types } from 'mongoose';

export const POST = withTenant(async (req, { tenantId }) => {
  const conversationId = req.nextUrl.pathname.split('/')[3];
  await connectDB();

  const { body, targetLang } = await req.json();
  if (!body || !targetLang) {
    return NextResponse.json({ error: 'body and targetLang required' }, { status: 400 });
  }

  const [conversation, tenant] = await Promise.all([
    Conversation.findOne({
      _id: new Types.ObjectId(conversationId),
      tenantId: new Types.ObjectId(tenantId),
    }),
    Tenant.findById(tenantId),
  ]);

  if (!conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  if (!tenant?.speechmaticsEnabled || !tenant.speechmaticsApiKey) {
    return NextResponse.json({ error: 'Translation not enabled' }, { status: 400 });
  }

  const apiKey = decrypt(tenant.speechmaticsApiKey);
  const result = await translate(body, 'en', targetLang, apiKey);

  return NextResponse.json({ translatedText: result.translatedText });
});
