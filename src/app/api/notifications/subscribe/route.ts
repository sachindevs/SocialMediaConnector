import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Types } from "mongoose";
import { withTenant } from "@/lib/tenant";

export const POST = withTenant(async (req: NextRequest, { tenantId, userId }) => {
  await connectDB();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subscription = body as PushSubscriptionJSON;

  if (!subscription?.endpoint || typeof subscription.endpoint !== "string") {
    return NextResponse.json({ error: "Invalid push subscription" }, { status: 422 });
  }

  await User.updateOne(
    {
      _id: new Types.ObjectId(userId),
      tenantId: new Types.ObjectId(tenantId),
    },
    { $set: { pushSubscription: subscription } }
  );

  return NextResponse.json({ success: true }, { status: 201 });
});
