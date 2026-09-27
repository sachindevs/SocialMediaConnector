"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Channel {
  _id: string;
  platform: "telegram" | "whatsapp" | "linkedin";
  isActive: boolean;
  phoneNumberId?: string;
  botUsername?: string;
  linkedinPageUrn?: string;
  createdAt: string;
}

const PLATFORM_META = {
  telegram: {
    name: "Telegram",
    icon: "✈️",
    description: "Connect a Telegram bot to receive and reply to messages.",
    setupPath: "/dashboard/channels/telegram",
    color: "bg-blue-50 border-blue-200",
  },
  whatsapp: {
    name: "WhatsApp",
    icon: "💬",
    description: "Connect WhatsApp Business API to manage customer conversations.",
    setupPath: "/dashboard/channels/whatsapp",
    color: "bg-green-50 border-green-200",
  },
  linkedin: {
    name: "LinkedIn",
    icon: "💼",
    description: "Connect LinkedIn to respond to messages from your page.",
    setupPath: "/dashboard/channels/linkedin",
    color: "bg-blue-50 border-indigo-200",
  },
};

export default function ChannelsPage() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/channels")
      .then((r) => r.json())
      .then((d) => setChannels(d.channels ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleToggle(channel: Channel) {
    setToggling(channel._id);
    try {
      const res = await fetch(`/api/channels/${channel._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !channel.isActive }),
      });
      if (res.ok) {
        setChannels((prev) =>
          prev.map((c) =>
            c._id === channel._id ? { ...c, isActive: !channel.isActive } : c
          )
        );
      }
    } finally {
      setToggling(null);
    }
  }

  async function handleDisconnect(channel: Channel) {
    if (!confirm(`Disconnect ${PLATFORM_META[channel.platform].name}?`)) return;
    setToggling(channel._id);
    try {
      const res = await fetch(`/api/channels/${channel._id}`, { method: "DELETE" });
      if (res.ok) {
        setChannels((prev) => prev.filter((c) => c._id !== channel._id));
      }
    } finally {
      setToggling(null);
    }
  }

  const connectedPlatforms = new Set(channels.map((c) => c.platform));

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Channels</h1>
      <p className="text-gray-500 mb-8">Manage your connected social media platforms.</p>

      {loading ? (
        <div className="text-gray-400">Loading channels…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(["telegram", "whatsapp", "linkedin"] as const).map((platform) => {
            const meta = PLATFORM_META[platform];
            const existing = channels.find((c) => c.platform === platform);
            const isConnected = connectedPlatforms.has(platform);

            return (
              <div
                key={platform}
                className={`rounded-xl border p-6 flex flex-col gap-4 ${meta.color}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{meta.icon}</span>
                  <div>
                    <h2 className="font-semibold text-gray-900">{meta.name}</h2>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        isConnected && existing?.isActive
                          ? "bg-green-100 text-green-700"
                          : isConnected
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {isConnected
                        ? existing?.isActive
                          ? "Active"
                          : "Paused"
                        : "Not connected"}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-600">{meta.description}</p>

                {existing && (
                  <div className="text-xs text-gray-500 space-y-0.5">
                    {existing.botUsername && <div>Bot: @{existing.botUsername}</div>}
                    {existing.phoneNumberId && <div>Phone ID: {existing.phoneNumberId}</div>}
                    {existing.linkedinPageUrn && <div>Page: {existing.linkedinPageUrn}</div>}
                  </div>
                )}

                <div className="mt-auto flex flex-col gap-2">
                  {!isConnected ? (
                    <Link
                      href={meta.setupPath}
                      className="inline-block text-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                    >
                      Connect
                    </Link>
                  ) : (
                    <>
                      <button
                        onClick={() => handleToggle(existing!)}
                        disabled={toggling === existing?._id}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        {toggling === existing?._id
                          ? "Saving…"
                          : existing?.isActive
                          ? "Pause"
                          : "Resume"}
                      </button>
                      <button
                        onClick={() => handleDisconnect(existing!)}
                        disabled={toggling === existing?._id}
                        className="px-4 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        Disconnect
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
