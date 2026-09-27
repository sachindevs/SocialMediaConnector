"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import type { IContact, IConversation } from "@/types";

const PLATFORM_COLORS: Record<string, string> = {
  whatsapp: "bg-green-100 text-green-700",
  telegram: "bg-blue-100 text-blue-700",
  linkedin: "bg-sky-100 text-sky-700",
};

function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
        PLATFORM_COLORS[platform] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {platform}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-yellow-100 text-yellow-700",
    pending: "bg-orange-100 text-orange-700",
    resolved: "bg-green-100 text-green-700",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
        colors[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}

export default function ContactProfilePage() {
  const params = useParams<{ contactId: string }>();
  const { contactId } = params;

  const [contact, setContact] = useState<IContact | null>(null);
  const [conversations, setConversations] = useState<IConversation[]>([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [notesSaving, setNotesSaving] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [page, setPage] = useState(1);

  const fetchContact = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/contacts/${contactId}?page=${p}&limit=20`);
        if (res.ok) {
          const data = await res.json();
          setContact(data.contact);
          setConversations(data.conversations ?? []);
          setPagination(data.pagination);
          if (p === 1) setNotes(data.contact?.notes ?? "");
        }
      } finally {
        setLoading(false);
      }
    },
    [contactId]
  );

  useEffect(() => {
    fetchContact(page);
  }, [fetchContact, page]);

  async function saveNotes() {
    setNotesSaving(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (res.ok) {
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2000);
      }
    } finally {
      setNotesSaving(false);
    }
  }

  if (loading && !contact) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Contact not found.
      </div>
    );
  }

  const platforms = [...new Set(contact.externalIds.map((x) => x.platform))];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex items-start gap-5">
        {contact.avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contact.avatar}
            alt={contact.name}
            className="w-16 h-16 rounded-full border border-gray-200 object-cover shrink-0"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-blue-600">
              {contact.name.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900">{contact.name}</h1>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {platforms.map((p) => (
              <PlatformBadge key={p} platform={p} />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Contact since {new Date(contact.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversations */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-semibold text-gray-800">
            Conversations{" "}
            <span className="text-sm font-normal text-gray-400">({pagination.total})</span>
          </h2>
          {conversations.length === 0 ? (
            <div className="text-sm text-gray-400 py-6 text-center bg-white border border-gray-200 rounded-xl">
              No conversations yet.
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => (
                <a
                  key={conv._id.toString()}
                  href={`/dashboard/inbox/${conv._id.toString()}`}
                  className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <PlatformBadge platform={conv.platform} />
                      <StatusBadge status={conv.status} />
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(conv.lastMessageAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1.5 truncate">
                    {conv.contactName}
                  </p>
                </a>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center gap-2 pt-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {pagination.pages}
              </span>
              <button
                disabled={page >= pagination.pages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Notes editor */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-800">Notes</h2>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={10}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder="Add notes about this contact…"
            />
            <button
              onClick={saveNotes}
              disabled={notesSaving}
              className="mt-2 w-full py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {notesSaving ? "Saving…" : notesSaved ? "Saved ✓" : "Save Notes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
