import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Message } from "@/models/Message";
import { Conversation } from "@/models/Conversation";
import { withTenant } from "@/lib/tenant";

export const GET = withTenant(async (req: NextRequest, { tenantId }) => {
  await connectDB();

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const tenantOid = new Types.ObjectId(tenantId);

  // Parallel search across messages and conversations
  const [messageResults, conversationResults] = await Promise.all([
    Message.aggregate([
      {
        $search: {
          index: "message_search",
          compound: {
            should: [
              {
                text: {
                  query: q,
                  path: "body",
                  fuzzy: { maxEdits: 1 },
                  score: { boost: { value: 2 } },
                },
              },
              {
                text: {
                  query: q,
                  path: "bodyTranslated",
                  fuzzy: { maxEdits: 1 },
                },
              },
            ],
          },
        },
      },
      { $match: { tenantId: tenantOid } },
      {
        $project: {
          _id: 1,
          conversationId: 1,
          body: 1,
          bodyTranslated: 1,
          sentAt: 1,
          sender: 1,
          score: { $meta: "searchScore" },
        },
      },
      { $limit: 15 },
    ]),

    Conversation.aggregate([
      {
        $search: {
          index: "conversation_search",
          text: {
            query: q,
            path: "contactName",
            fuzzy: { maxEdits: 1 },
          },
        },
      },
      { $match: { tenantId: tenantOid } },
      {
        $project: {
          _id: 1,
          contactName: 1,
          platform: 1,
          status: 1,
          lastMessageAt: 1,
          score: { $meta: "searchScore" },
        },
      },
      { $limit: 10 },
    ]),
  ]);

  // Merge, tag with type, sort by score descending, cap at 20
  const merged = [
    ...messageResults.map((m) => ({ type: "message" as const, ...m })),
    ...conversationResults.map((c) => ({ type: "conversation" as const, ...c })),
  ]
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 20);

  return NextResponse.json({ results: merged, query: q });
});
