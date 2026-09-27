import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ChannelConfig } from "@/models/ChannelConfig";
import { encrypt } from "@/lib/encryption";
import { getServerSession } from "@/lib/auth";

const LINKEDIN_CLIENT_ID = process.env.LINKEDIN_CLIENT_ID!;
const LINKEDIN_CLIENT_SECRET = process.env.LINKEDIN_CLIENT_SECRET!;
const LINKEDIN_REDIRECT_URI = process.env.LINKEDIN_REDIRECT_URI!;

const LINKEDIN_SCOPES = ["r_liteprofile", "r_emailaddress", "w_member_social", "r_1st_connections_size"].join(" ");

export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // Initial OAuth redirect (no code yet)
  if (!code) {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    const oauthState = Buffer.from(
      JSON.stringify({ tenantId: session.user.tenantId, ts: Date.now() })
    ).toString("base64url");

    const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", LINKEDIN_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", LINKEDIN_REDIRECT_URI);
    authUrl.searchParams.set("state", oauthState);
    authUrl.searchParams.set("scope", LINKEDIN_SCOPES);

    return NextResponse.redirect(authUrl.toString());
  }

  // Callback — exchange code for tokens
  if (error) {
    return NextResponse.redirect(
      new URL(`/dashboard/channels/linkedin?error=${encodeURIComponent(error)}`, req.url)
    );
  }

  if (!state) {
    return NextResponse.redirect(
      new URL("/dashboard/channels/linkedin?error=invalid_state", req.url)
    );
  }

  let tenantId: string;
  try {
    const decoded = JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
    tenantId = decoded.tenantId;
  } catch {
    return NextResponse.redirect(
      new URL("/dashboard/channels/linkedin?error=invalid_state", req.url)
    );
  }

  // Exchange code for tokens
  const tokenParams = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: LINKEDIN_REDIRECT_URI,
    client_id: LINKEDIN_CLIENT_ID,
    client_secret: LINKEDIN_CLIENT_SECRET,
  });

  const tokenRes = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: tokenParams.toString(),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      new URL("/dashboard/channels/linkedin?error=token_exchange_failed", req.url)
    );
  }

  const tokens: { access_token: string; refresh_token?: string; expires_in?: number } =
    await tokenRes.json();

  await connectDB();

  // Upsert the LinkedIn channel config for this tenant
  await ChannelConfig.findOneAndUpdate(
    { tenantId, platform: "linkedin" },
    {
      $set: {
        accessToken: encrypt(tokens.access_token),
        refreshToken: tokens.refresh_token ? encrypt(tokens.refresh_token) : undefined,
        isActive: true,
      },
      $setOnInsert: {
        tenantId,
        platform: "linkedin",
      },
    },
    { upsert: true, new: true }
  );

  return NextResponse.redirect(new URL("/dashboard/channels?connected=linkedin", req.url));
}
