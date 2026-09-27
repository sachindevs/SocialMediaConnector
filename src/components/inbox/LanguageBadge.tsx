'use client';

const FLAG_MAP: Record<string, string> = {
  ar: '🇸🇦', hi: '🇮🇳', de: '🇩🇪', fr: '🇫🇷', es: '🇪🇸',
  pt: '🇧🇷', zh: '🇨🇳', ja: '🇯🇵', ko: '🇰🇷', ru: '🇷🇺',
  it: '🇮🇹', nl: '🇳🇱', tr: '🇹🇷', pl: '🇵🇱', vi: '🇻🇳',
  th: '🇹🇭', id: '🇮🇩', ms: '🇲🇾', uk: '🇺🇦', sv: '🇸🇪',
};

interface LanguageBadgeProps {
  language: string;
  confidence?: number;
}

export default function LanguageBadge({ language, confidence }: LanguageBadgeProps) {
  const flag = FLAG_MAP[language.toLowerCase()] || '🌐';
  const code = language.toUpperCase();
  const isLowConfidence = confidence !== undefined && confidence < 0.7;

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${
      isLowConfidence ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
    }`}>
      {flag} {code}
      {isLowConfidence && <span title="Low translation confidence">⚠️</span>}
    </span>
  );
}
