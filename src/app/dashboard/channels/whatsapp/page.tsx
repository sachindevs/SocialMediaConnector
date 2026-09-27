"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WhatsAppSetupPage() {
  const router = useRouter();
  const [phoneNumberId, setPhoneNumberId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "whatsapp",
          accessToken,
          webhookSecret: webhookSecret || undefined,
          phoneNumberId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Failed to save channel");
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

      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Connect WhatsApp</h1>
      <p className="text-gray-500 mb-8 text-sm">
        Enter your WhatsApp Business API credentials from the Meta Developer Portal.
      </p>

      {success ? (
        <div className="rounded-lg bg-green-50 border border-green-200 p-4 text-green-700 text-sm">
          ✅ WhatsApp connected successfully! Redirecting…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Phone Number ID
            </label>
            <input
              type="text"
              value={phoneNumberId}
              onChange={(e) => setPhoneNumberId(e.target.value)}
              placeholder="1234567890"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Permanent Access Token
            </label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="EAAxxxxxxxxxx..."
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Webhook Verify Token
            </label>
            <input
              type="text"
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="my-secret-token"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              The same token you set in the Meta webhook configuration.
            </p>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-blue-700 text-sm">
            <strong>Webhook URL:</strong>
            <br />
            <code className="text-xs break-all">
              {typeof window !== "undefined"
                ? `${window.location.origin}/api/webhooks/whatsapp/{tenantId}`
                : "/api/webhooks/whatsapp/{tenantId}"}
            </code>
          </div>

          <button
            type="submit"
            disabled={loading || !phoneNumberId.trim() || !accessToken.trim()}
            className="w-full px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Connecting…" : "Connect WhatsApp"}
          </button>
        </form>
      )}
    </div>
  );
}
