'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import ConversationList from '@/components/inbox/ConversationList';
import ConversationThread from '@/components/inbox/ConversationThread';
import ReplyBox from '@/components/inbox/ReplyBox';
import { useSocket } from '@/hooks/useSocket';

interface Conversation {
  _id: string;
  contactName: string;
  platform: 'whatsapp' | 'linkedin' | 'telegram';
  status: string;
  lastMessageAt: string;
  customerLanguage?: string;
  autoTranslateOutbound: boolean;
}

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

export default function InboxPage() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('open');

  const socket = useSocket(session?.user?.tenantId || '');

  const fetchConversations = useCallback(async () => {
    const res = await fetch(`/api/conversations?status=${statusFilter}&limit=50`);
    if (res.ok) {
      const data = await res.json();
      setConversations(data.conversations);
    }
    setLoading(false);
  }, [statusFilter]);

  const fetchMessages = useCallback(async (convId: string) => {
    const res = await fetch(`/api/conversations/${convId}`);
    if (res.ok) {
      const data = await res.json();
      setMessages(data.messages);
    }
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!socket) return;

    socket.on('new-message', (data: any) => {
      setConversations((prev) => {
        const existing = prev.find((c) => c._id === data.conversationId);
        if (existing) {
          return [
            { ...existing, lastMessageAt: data.conversation.lastMessageAt },
            ...prev.filter((c) => c._id !== data.conversationId),
          ];
        }
        return prev;
      });
      if (selectedId === data.conversationId) {
        setMessages((prev) => [...prev, data.message]);
      }
    });

    socket.on('message-translated', (data: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId
            ? { ...m, bodyTranslated: data.bodyTranslated, translationApplied: true, detectedLanguage: data.detectedLanguage, translationConfidence: data.translationConfidence }
            : m
        )
      );
    });

    socket.on('message-translation-failed', (data: any) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === data.messageId ? { ...m, translationFailed: true } : m))
      );
    });

    return () => {
      socket.off('new-message');
      socket.off('message-translated');
      socket.off('message-translation-failed');
    };
  }, [socket, selectedId]);

  const selectedConversation = conversations.find((c) => c._id === selectedId);

  const handleSelectConversation = (id: string) => {
    setSelectedId(id);
    fetchMessages(id);
  };

  const handleMessageSent = (message: Message) => {
    setMessages((prev) => [...prev, message]);
    setConversations((prev) =>
      prev.map((c) =>
        c._id === selectedId ? { ...c, lastMessageAt: new Date().toISOString() } : c
      )
    );
  };

  return (
    <div className="flex h-full">
      {/* Left panel — Conversation List */}
      <div className="w-80 border-r border-gray-200 bg-white flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-2">Inbox</h2>
          <div className="flex gap-1">
            {['open', 'pending', 'resolved'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 text-xs rounded-full font-medium capitalize transition-colors ${
                  statusFilter === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Loading conversations...
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            onSelect={handleSelectConversation}
          />
        )}
      </div>

      {/* Right panel — Thread + Reply */}
      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedConversation ? (
          <>
            <div className="px-6 py-4 bg-white border-b border-gray-200 flex items-center gap-3">
              <PlatformBadge platform={selectedConversation.platform} />
              <div>
                <h3 className="font-semibold text-gray-900">{selectedConversation.contactName}</h3>
                <p className="text-xs text-gray-500 capitalize">{selectedConversation.platform} · {selectedConversation.status}</p>
              </div>
            </div>
            <ConversationThread messages={messages} />
            <ReplyBox
              conversationId={selectedConversation._id}
              customerLanguage={selectedConversation.customerLanguage}
              autoTranslateOutbound={selectedConversation.autoTranslateOutbound}
              onMessageSent={handleMessageSent}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="font-medium text-gray-500">Select a conversation</p>
              <p className="text-sm mt-1">Choose from the list on the left</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlatformBadge({ platform }: { platform: string }) {
  const colors: Record<string, string> = {
    whatsapp: 'bg-green-100 text-green-800',
    linkedin: 'bg-blue-100 text-blue-800',
    telegram: 'bg-cyan-100 text-cyan-800',
  };
  const labels: Record<string, string> = {
    whatsapp: 'WA',
    linkedin: 'LI',
    telegram: 'TG',
  };
  return (
    <span className={`text-xs font-bold px-2 py-1 rounded ${colors[platform] || 'bg-gray-100 text-gray-700'}`}>
      {labels[platform] || platform.toUpperCase()}
    </span>
  );
}
