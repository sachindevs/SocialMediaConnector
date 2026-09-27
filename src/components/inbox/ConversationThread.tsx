'use client';

import { useRef, useEffect } from 'react';
import LanguageBadge from './LanguageBadge';
import { useState } from 'react';

interface Message {
  _id: string;
  sender: 'customer' | 'agent';
  body: string;
  bodyTranslated?: string;
  detectedLanguage?: string;
  translationConfidence?: number;
  translationApplied: boolean;
  translationFailed: boolean;
  isInternal: boolean;
  mediaUrl?: string;
  mediaType?: string;
  sentAt: string;
  agentId?: { name: string; image?: string };
}

interface ConversationThreadProps {
  messages: Message[];
}

export default function ConversationThread({ messages }: ConversationThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
      {messages.length === 0 && (
        <div className="text-center text-gray-400 text-sm py-8">
          No messages yet. The conversation will appear here.
        </div>
      )}
      {messages.map((msg) => (
        <MessageBubble key={msg._id} message={msg} />
      ))}
      <div ref={bottomRef} />
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const [showOriginal, setShowOriginal] = useState(false);
  const isAgent = message.sender === 'agent';
  const isInternal = message.isInternal;

  const displayText = !isAgent && message.translationApplied && message.bodyTranslated
    ? message.bodyTranslated
    : message.body;

  return (
    <div className={`flex ${isAgent ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-sm lg:max-w-md xl:max-w-lg space-y-1`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm ${
            isInternal
              ? 'bg-amber-50 border border-amber-200 text-amber-900'
              : isAgent
              ? 'bg-indigo-600 text-white'
              : 'bg-white border border-gray-200 text-gray-900'
          }`}
        >
          {isInternal && (
            <p className="text-xs text-amber-600 font-medium mb-1">🔒 Internal note</p>
          )}
          {message.mediaType === 'image' && message.mediaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/media/${message.mediaUrl}`}
              alt="Media"
              className="rounded-lg max-w-full mb-2"
            />
          )}
          <p>{displayText}</p>

          {/* Show original toggle */}
          {!isAgent && message.translationApplied && message.bodyTranslated && (
            <button
              onClick={() => setShowOriginal((v) => !v)}
              className="text-xs text-gray-400 hover:text-gray-600 mt-1 block"
            >
              {showOriginal ? 'Hide original' : 'Show original'}
            </button>
          )}
          {showOriginal && (
            <p className="text-xs italic text-gray-500 mt-1 border-t border-gray-100 pt-1">
              {message.body}
            </p>
          )}

          {/* Translation failed */}
          {!isAgent && message.translationFailed && (
            <span className="text-xs text-gray-400 mt-1 block">[Translation unavailable]</span>
          )}
        </div>

        <div className={`flex items-center gap-2 ${isAgent ? 'justify-end' : 'justify-start'}`}>
          {!isAgent && message.detectedLanguage && (
            <LanguageBadge language={message.detectedLanguage} confidence={message.translationConfidence} />
          )}
          <span className="text-xs text-gray-400">
            {new Date(message.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}
