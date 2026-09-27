'use client';

interface Conversation {
  _id: string;
  contactName: string;
  platform: string;
  status: string;
  lastMessageAt: string;
  assignedAgentId?: { name: string; image?: string };
  customerLanguage?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const PLATFORM_COLORS: Record<string, string> = {
  whatsapp: 'bg-green-500',
  linkedin: 'bg-blue-600',
  telegram: 'bg-cyan-500',
};

const PLATFORM_LABELS: Record<string, string> = {
  whatsapp: 'WA',
  linkedin: 'LI',
  telegram: 'TG',
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function ConversationList({ conversations, selectedId, onSelect }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center text-gray-400">
          <p className="text-sm font-medium">No conversations</p>
          <p className="text-xs mt-1">Connect a channel to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => (
        <button
          key={conv._id}
          onClick={() => onSelect(conv._id)}
          className={`w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${
            selectedId === conv._id ? 'bg-indigo-50 border-l-2 border-l-indigo-500' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full ${PLATFORM_COLORS[conv.platform] || 'bg-gray-400'} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
              {PLATFORM_LABELS[conv.platform] || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-gray-900 truncate">{conv.contactName}</p>
                <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                  {timeAgo(conv.lastMessageAt)}
                </span>
              </div>
              <p className="text-xs text-gray-500 capitalize">{conv.platform}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
