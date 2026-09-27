import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ChannelConfig } from "@/models/ChannelConfig";
import { decrypt } from "@/lib/encryption";
import { deleteWebhook } from "@/lib/platforms/telegram";
import { withTenant } from "@/lib/tenant";

export const PATCH = withTenant(
  async (req: NextRequest, { tenantId }, params) => {
    const { channelId } = params;
    await connectDB();

    const channel = await ChannelConfig.findOne({ _id: channelId, tenantId });
    if (!channel) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    let body: { isActive?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (typeof body.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive (boolean) required" }, { status: 400 });
    }

    channel.isActive = body.isActive;
    await channel.save();

    return NextResponse.json({ channel: { _id: channel._id, isActive: channel.isActive } });
  }
);

export const DELETE = withTenant(
  async (_req, { tenantId }, params) => {
    const { channelId } = params;
    await connectDB();

    const channel = await ChannelConfig.findOne({ _id: channelId, tenantId });
    if (!channel) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Unregister webhook for Telegram
    if (channel.platform === "telegram" && channel.accessToken) {
      try {
        const botToken = decrypt(channel.accessToken);
        await deleteWebhook(botToken);
      } catch (err) {
        console.warn("[channels] deleteWebhook failed:", err);
      }
    }

    await ChannelConfig.deleteOne({ _id: channelId, tenantId });

    return NextResponse.json({ ok: true });
  }
);
