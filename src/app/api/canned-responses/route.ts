import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { CannedResponse } from "@/models/CannedResponse";
import { withTenant } from "@/lib/tenant";

const CreateSchema = z.object({
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(5000),
  shortcut: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_-]+$/, "Shortcut must be lowercase alphanumeric, dash or underscore"),
});

export const GET = withTenant(async (req: NextRequest, { tenantId }) => {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() ?? "";

  const filter: Record<string, unknown> = {
    tenantId: new Types.ObjectId(tenantId),
  };

  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { shortcut: { $regex: q, $options: "i" } },
    ];
  }

  const responses = await CannedResponse.find(filter)
    .sort({ title: 1 })
    .limit(100)
    .lean();

  return NextResponse.json({ cannedResponses: responses });
});

export const POST = withTenant(async (req: NextRequest, { tenantId, userId }) => {
  await connectDB();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const { title, body: responseBody, shortcut } = parsed.data;

  const existing = await CannedResponse.findOne({
    tenantId: new Types.ObjectId(tenantId),
    shortcut,
  });
  if (existing) {
    return NextResponse.json({ error: "Shortcut already in use" }, { status: 409 });
  }

  const cannedResponse = await CannedResponse.create({
    tenantId: new Types.ObjectId(tenantId),
    title,
    body: responseBody,
    shortcut,
    createdBy: new Types.ObjectId(userId),
  });

  return NextResponse.json({ cannedResponse }, { status: 201 });
});
