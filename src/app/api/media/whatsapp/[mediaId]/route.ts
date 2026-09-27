import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { ChannelConfig } from "@/models/ChannelConfig";
import { connectDB } from "@/lib/db";
import { Types } from "mongoose";
import { decrypt } from "@/lib/encryption";

export async function GET(
  _req: NextRequest,
  { params }: { params: { mediaId: string } }
) {
  const session = await getServerSession();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { mediaId } = params;

  const channelConfig = await ChannelConfig.findOne({
    tenantId: new Types.ObjectId(session.user.tenantId),
    platform: "whatsapp",
    isActive: true,
  }).lean();

  if (!channelConfig) {
    return NextResponse.json({ error: "No active WhatsApp channel" }, { status: 404 });
  }

  const accessToken = decrypt(channelConfig.accessToken);

  // Step 1: Resolve media URL from Meta Graph API
  const metaRes = await fetch(
    `https://graph.facebook.com/v19.0/${encodeURIComponent(mediaId)}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!metaRes.ok) {
    const errText = await metaRes.text();
    console.error("[WhatsApp Media] Meta API error:", errText);
    return NextResponse.json({ error: "Failed to resolve media" }, { status: 502 });
  }

  const metaData = (await metaRes.json()) as { url?: string; mime_type?: string };

  if (!metaData.url) {
    return NextResponse.json({ error: "Media URL not found" }, { status: 404 });
  }

  // Step 2: Download media bytes
  const mediaRes = await fetch(metaData.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!mediaRes.ok) {
    return NextResponse.json({ error: "Failed to download media" }, { status: 502 });
  }

  const contentType = metaData.mime_type ?? mediaRes.headers.get("content-type") ?? "application/octet-stream";
  const body = mediaRes.body;

  if (!body) {
    return NextResponse.json({ error: "Empty media body" }, { status: 502 });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": "inline",
    },
  });
}
