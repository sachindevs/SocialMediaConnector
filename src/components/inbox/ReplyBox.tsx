'use client';

import { useState, useRef, KeyboardEvent } from 'react';
import { Send, Lock } from 'lucide-react';

interface ReplyBoxProps {
  conversationId: string;
  customerLanguage?: string;
  autoTranslateOutbound: boolean;
  onMessageSent: (message: any) => void;
}

export default function ReplyBox({
  conversationId,
  customerLanguage,
  autoTranslateOutbound,
  onMessageSent,
}: ReplyBoxProps) {
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [translateEnabled, setTranslateEnabled] = useState(autoTranslateOutbound);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setSending] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const fetchPreview = async () => {
    if (!body.trim() || !customerLanguage || !translateEnabled || isInternal) return;
    setPreviewLoading(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/translate-preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, targetLang: customerLanguage }),
      });
      if (res.ok) {
        const data = await res.json();
        setPreview(data.translatedText);
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleSend = async () => {
    if (!body.trim() || loading) return;

    // If translation enabled, fetch preview first
    if (translateEnabled && customerLanguage && !isInternal && !preview) {
      await fetchPreview();
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          body,
          isInternal,
          outboundTranslatedBody: preview || undefined,
          outboundLang: preview ? 'detected' : 'en',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        onMessageSent(data.message);
        setBody('');
        setPreview(null);
        textareaRef.current?.focus();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 p-4">
      {/* Tab toggle */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setIsInternal(false)}
          className={`text-xs px-3 py-1 rounded-full font-medium ${!isInternal ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          Reply
        </button>
        <button
          onClick={() => setIsInternal(true)}
          className={`text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1 ${isInternal ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}
        >
          <Lock className="w-3 h-3" /> Note
        </button>
      </div>

      {/* Translation toggle */}
      {!isInternal && customerLanguage && customerLanguage !== 'en' && (
        <div className="flex items-center gap-2 mb-3 text-xs text-gray-600">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={translateEnabled}
              onChange={(e) => { setTranslateEnabled(e.target.checked); setPreview(null); }}
              className="rounded"
            />
            Auto-translate reply → {customerLanguage.toUpperCase()}
          </label>
        </div>
      )}

      {/* Translation preview */}
      {preview && (
        <div className="mb-3 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm">
          <p className="text-xs text-purple-600 font-medium mb-1">Will be sent as:</p>
          <p className="text-gray-800">{preview}</p>
          <button onClick={() => setPreview(null)} className="text-xs text-purple-400 mt-1">Edit</button>
        </div>
      )}

      {/* Textarea */}
      <div className={`flex gap-2 ${isInternal ? 'bg-amber-50 rounded-lg p-2' : ''}`}>
        <textarea
          ref={textareaRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isInternal ? 'Add a private note for your team...' : 'Type a reply... (Ctrl+Enter to send)'}
          rows={3}
          className="flex-1 resize-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || loading}
          className="self-end px-4 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-40 hover:bg-indigo-700 transition-colors"
        >
          {loading || previewLoading ? (
            <span className="text-xs">...</span>
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
