"use client";

import { useRouter } from "next/navigation";

export default function LinkedInSetupPage() {
  const router = useRouter();

  function handleConnect() {
    router.push("/api/auth/linkedin");
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="mb-6">
        <a href="/dashboard/channels" className="text-sm text-blue-600 hover:underline">
          ← Back to Channels
        </a>
      </div>

      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Connect LinkedIn</h1>
      <p className="text-gray-500 mb-8 text-sm">
        Authorize access to your LinkedIn page to manage messages through the platform.
      </p>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 mb-6 space-y-2">
        <p className="font-medium">Before connecting:</p>
        <ul className="list-disc list-inside space-y-1 text-blue-700">
          <li>Ensure your LinkedIn app has <strong>w_member_social</strong> scope</li>
          <li>Add the callback URL to your LinkedIn app's OAuth settings</li>
          <li>You must be an admin of the LinkedIn Page</li>
        </ul>
      </div>

      <button
        onClick={handleConnect}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#0A66C2] text-white rounded-lg text-sm font-medium hover:bg-[#0a5aad] transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
        Connect with LinkedIn
      </button>

      <p className="text-xs text-gray-400 mt-4 text-center">
        You will be redirected to LinkedIn to authorize access.
      </p>
    </div>
  );
}
