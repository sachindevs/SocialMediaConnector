"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TelegramSetupPage() {
  const router = useRouter();
  const [botToken, setBotToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const webhookSecret = crypto.randomUUID().replace(/-/g, "");
      const webhookUrl = `${window.location.origin}/api/webhooks/telegram/${encodeURIComponent(
        // We'll get the tenantId from the API response
        "__TENANT__"
      )}`;

      // First create the channel config
      const createRes = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "telegram",
          accessToken: botToken,
          webhookSecret,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save channel");
      }

      const { channel } = await createRes.json();
      const tenantWebhookUrl = `${window.location.origin}/api/webhooks/telegram/${channel._id}`;

      // Then register the webhook with Telegram
      const webhookRes = await fetch("/api/channels/telegram/set-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channelId: channel._id,
          webhookUrl: tenantWebhookUrl,
        }),
      });

      if (!webhookRes.ok) {
        console.warn("[telegram setup] webhook registration failed, continuing anyway");
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard/channels"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="mb-6">
        <a href="/dashboard/channels" className="text-sm text-blue-600 hover:underline">
          ← Back to Channels
        </a>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Connect Telegram</h1>
      <p className="text-gray-500 mb-8 text-sm">
        Create a bot via{" "}
        <a
          href="https://t.me/BotFather"
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline"
        >
          @BotFather
        </a>{" "}
        and paste your bot token below.
      </p>

      {success ? (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
          ✅ Telegram connected successfully! Redirecting…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Bot Token
            </label>
            <input
              type="password"
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              placeholder="123456789:AAHvDFkljafsdfjhEXAMPLE"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Obtain from @BotFather on Telegram.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !botToken.trim()}
            className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Connecting…" : "Connect Bot"}
          </button>
        </form>
      )}
    </div>
  );
}
