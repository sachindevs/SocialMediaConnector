import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { connectDB } from "@/lib/db";
import { ChannelConfig } from "@/models/ChannelConfig";
import { decrypt } from "@/lib/encryption";
import { getProfile } from "@/lib/platforms/linkedin";
import { addInboundMessage } from "@/lib/queues/messageQueue";

interface LinkedInMessageEvent {
  id?: string;
  createdAt?: number;
  sender?: {
    "com.linkedin.voyager.messaging.MessagingMember"?: {
      miniProfile?: {
        entityUrn?: string;
        firstName?: string;
        lastName?: string;
        picture?: {
          "com.linkedin.common.VectorImage"?: {
            rootUrl?: string;
            artifacts?: Array<{ fileIdentifyingUrlPathSegment?: string }>;
          };
        };
      };
    };
  };
  body?: {
    text?: string;
  };
  conversation?: {
    "com.linkedin.voyager.messaging.Conversation"?: {
      entityUrn?: string;
    };
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { tenantId: string } }
): Promise<NextResponse> {
  const { tenantId } = params;
  const rawBody = await req.text();
  const signature = req.headers.get("x-li-signature") ?? "";

  await connectDB();
  const channelConfig = await ChannelConfig.findOne({
    tenantId,
    platform: "linkedin",
    isActive: true,
  });

  if (!channelConfig) {
    return NextResponse.json({ ok: true });
  }

  // Verify X-Li-Signature
  const webhookSecret = channelConfig.webhookSecret
    ? decrypt(channelConfig.webhookSecret)
    : null;

  if (webhookSecret && signature) {
    const expected = createHmac("sha256", webhookSecret).update(rawBody).digest("base64");
    const expectedBuf = Buffer.from(expected);
    const signatureBuf = Buffer.from(signature);
    if (
      expectedBuf.length !== signatureBuf.length ||
      !timingSafeEqual(expectedBuf, signatureBuf)
    ) {
      return NextResponse.json({ ok: true });
    }
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const event = (payload.value as LinkedInMessageEvent) ?? (payload as LinkedInMessageEvent);

  const miniProfile =
    event.sender?.["com.linkedin.voyager.messaging.MessagingMember"]?.miniProfile;
  const senderUrn = miniProfile?.entityUrn ?? "";

  const timestamp = event.createdAt
    ? Math.floor(event.createdAt / 1000)
    : Math.floor(Date.now() / 1000);

  const body = event.body?.text ?? "";
  const platformMessageId = event.id ?? `li_${timestamp}_${senderUrn}`;

  // Resolve sender name from profile
  let contactName = [miniProfile?.firstName, miniProfile?.lastName]
    .filter(Boolean)
    .join(" ") || senderUrn;

  let contactAvatar: string | undefined;

  if (senderUrn) {
    try {
      const accessToken = decrypt(channelConfig.accessToken);
      const profile = await getProfile(accessToken, senderUrn);
      const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(" ");
      if (fullName) contactName = fullName;
      if (profile.pictureUrl) contactAvatar = profile.pictureUrl;
    } catch (err) {
      console.warn("[linkedin webhook] getProfile failed:", err);
    }
  }

  if (!senderUrn || !body) {
    return NextResponse.json({ ok: true });
  }

  await addInboundMessage({
    platform: "linkedin",
    tenantId,
    channelConfigId: channelConfig._id.toString(),
    externalContactId: senderUrn,
    contactName,
    contactAvatar,
    body,
    platformMessageId,
    timestamp,
  });

  return NextResponse.json({ ok: true });
}
