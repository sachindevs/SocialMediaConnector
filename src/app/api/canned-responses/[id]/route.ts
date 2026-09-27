import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { CannedResponse } from "@/models/CannedResponse";
import { withTenant, withRole } from "@/lib/tenant";

const UpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  body: z.string().min(1).max(5000).optional(),
  shortcut: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_-]+$/)
    .optional(),
});

export const PUT = withTenant(
  async (req: NextRequest, { tenantId }, params) => {
    await connectDB();
    const { id } = params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    if (parsed.data.shortcut) {
      const conflict = await CannedResponse.findOne({
        tenantId: new Types.ObjectId(tenantId),
        shortcut: parsed.data.shortcut,
        _id: { $ne: new Types.ObjectId(id) },
      });
      if (conflict) {
        return NextResponse.json({ error: "Shortcut already in use" }, { status: 409 });
      }
    }

    const updated = await CannedResponse.findOneAndUpdate(
      { _id: new Types.ObjectId(id), tenantId: new Types.ObjectId(tenantId) },
      { $set: parsed.data },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ cannedResponse: updated });
  }
);

export const DELETE = withRole(
  ["admin"],
  async (_req: NextRequest, { tenantId }, params) => {
    await connectDB();
    const { id } = params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const deleted = await CannedResponse.findOneAndDelete({
      _id: new Types.ObjectId(id),
      tenantId: new Types.ObjectId(tenantId),
    });

    if (!deleted) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  }
);
