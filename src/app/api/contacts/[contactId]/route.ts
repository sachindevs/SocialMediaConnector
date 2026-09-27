import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Contact } from "@/models/Contact";
import { Conversation } from "@/models/Conversation";
import { withTenant } from "@/lib/tenant";

export const GET = withTenant(
  async (req: NextRequest, { tenantId }, params) => {
    await connectDB();
    const { contactId } = params;

    if (!Types.ObjectId.isValid(contactId)) {
      return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const skip = (page - 1) * limit;

    const contact = await Contact.findOne({
      _id: new Types.ObjectId(contactId),
      tenantId: new Types.ObjectId(tenantId),
    }).lean();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const [conversations, total] = await Promise.all([
      Conversation.find({
        tenantId: new Types.ObjectId(tenantId),
        contactId: new Types.ObjectId(contactId),
      })
        .sort({ lastMessageAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("assignedAgentId", "name image")
        .lean(),
      Conversation.countDocuments({
        tenantId: new Types.ObjectId(tenantId),
        contactId: new Types.ObjectId(contactId),
      }),
    ]);

    return NextResponse.json({
      contact,
      conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

export const PATCH = withTenant(
  async (req: NextRequest, { tenantId }, params) => {
    await connectDB();
    const { contactId } = params;

    if (!Types.ObjectId.isValid(contactId)) {
      return NextResponse.json({ error: "Invalid contact ID" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { notes } = body as { notes?: string };
    if (typeof notes !== "string") {
      return NextResponse.json({ error: "notes must be a string" }, { status: 422 });
    }

    const updated = await Contact.findOneAndUpdate(
      {
        _id: new Types.ObjectId(contactId),
        tenantId: new Types.ObjectId(tenantId),
      },
      { $set: { notes } },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ contact: updated });
  }
);
