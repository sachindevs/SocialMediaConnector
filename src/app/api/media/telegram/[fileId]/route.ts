import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth";
import { ChannelConfig } from "@/models/ChannelConfig";
import { connectDB } from "@/lib/db";
import { Types } from "mongoose";
import { decrypt } from "@/lib/encryption";

export async function GET(
  _req: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const session = await getServerSession();
  if (!session?.user?.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { fileId } = params;

  const channelConfig = await ChannelConfig.findOne({
    tenantId: new Types.ObjectId(session.user.tenantId),
    platform: "telegram",
    isActive: true,
  }).lean();

  if (!channelConfig) {
    return NextResponse.json({ error: "No active Telegram channel" }, { status: 404 });
  }

  const botToken = decrypt(channelConfig.accessToken);

  // Step 1: Get file path from Telegram Bot API
  const fileInfoRes = await fetch(
    `https://api.telegram.org/bot${botToken}/getFile?file_id=${encodeURIComponent(fileId)}`
  );

  if (!fileInfoRes.ok) {
    const errText = await fileInfoRes.text();
    console.error("[Telegram Media] getFile error:", errText);
    return NextResponse.json({ error: "Failed to resolve Telegram file" }, { status: 502 });
  }

  const fileInfo = (await fileInfoRes.json()) as {
    ok: boolean;
    result?: { file_path?: string };
  };

  if (!fileInfo.ok || !fileInfo.result?.file_path) {
    return NextResponse.json({ error: "File path not found" }, { status: 404 });
  }

  const filePath = fileInfo.result.file_path;
  const downloadUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;

  // Step 2: Stream the file
  const mediaRes = await fetch(downloadUrl);

  if (!mediaRes.ok) {
    return NextResponse.json({ error: "Failed to download Telegram file" }, { status: 502 });
  }

  const contentType = mediaRes.headers.get("content-type") ?? "application/octet-stream";
  const body = mediaRes.body;

  if (!body) {
    return NextResponse.json({ error: "Empty file body" }, { status: 502 });
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
