import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ChannelConfig } from "@/models/ChannelConfig";
import { encrypt } from "@/lib/encryption";
import { withTenant } from "@/lib/tenant";

export const GET = withTenant(async (_req, { tenantId }) => {
  await connectDB();
  const channels = await ChannelConfig.find({ tenantId }).lean();
  // Mask sensitive fields
  const sanitized = channels.map((c) => ({
    _id: c._id,
    platform: c.platform,
    isActive: c.isActive,
    phoneNumberId: c.phoneNumberId,
    botUsername: c.botUsername,
    linkedinPageUrn: c.linkedinPageUrn,
    createdAt: c.createdAt,
  }));
  return NextResponse.json({ channels: sanitized });
});

export const POST = withTenant(async (req: NextRequest, { tenantId }) => {
  await connectDB();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { platform, accessToken, refreshToken, webhookSecret, phoneNumberId, botUsername, linkedinPageUrn } = body as {
    platform: string;
    accessToken?: string;
    refreshToken?: string;
    webhookSecret?: string;
    phoneNumberId?: string;
    botUsername?: string;
    linkedinPageUrn?: string;
  };

  if (!platform || !["whatsapp", "linkedin", "telegram"].includes(platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  if (!accessToken) {
    return NextResponse.json({ error: "accessToken is required" }, { status: 400 });
  }

  const channelConfig = await ChannelConfig.create({
    tenantId,
    platform,
    accessToken: encrypt(accessToken),
    refreshToken: refreshToken ? encrypt(refreshToken) : undefined,
    webhookSecret: webhookSecret ? encrypt(webhookSecret) : undefined,
    phoneNumberId,
    botUsername,
    linkedinPageUrn,
    isActive: true,
  });

  return NextResponse.json(
    {
      channel: {
        _id: channelConfig._id,
        platform: channelConfig.platform,
        isActive: channelConfig.isActive,
        phoneNumberId: channelConfig.phoneNumberId,
        botUsername: channelConfig.botUsername,
        linkedinPageUrn: channelConfig.linkedinPageUrn,
        createdAt: channelConfig.createdAt,
      },
    },
    { status: 201 }
  );
});
