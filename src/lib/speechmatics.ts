import redis from '@/lib/redis';
import crypto from 'crypto';

export class SpeechmaticsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpeechmaticsError';
  }
}

export class SpeechmaticsTimeoutError extends SpeechmaticsError {
  constructor() {
    super('Speechmatics API request timed out');
    this.name = 'SpeechmaticsTimeoutError';
  }
}

export class SpeechmaticsRateLimitError extends SpeechmaticsError {
  retryAfter: number;
  constructor(retryAfter: number) {
    super(`Speechmatics rate limit exceeded. Retry after ${retryAfter}s`);
    this.name = 'SpeechmaticsRateLimitError';
    this.retryAfter = retryAfter;
  }
}

interface DetectionResult {
  language: string;
  confidence: number;
}

interface TranslationResult {
  translatedText: string;
}

const BASE_URL =
  process.env.SPEECHMATICS_BASE_URL || 'https://translation.api.speechmatics.com';
const TIMEOUT_MS = 8000;
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60;

function getCacheKey(text: string, src: string, tgt: string): string {
  return (
    'smt:' +
    crypto
      .createHash('sha256')
      .update(`${text}|${src}|${tgt}`)
      .digest('hex')
  );
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err: any) {
    if (err.name === 'AbortError') throw new SpeechmaticsTimeoutError();
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function detectLanguage(
  text: string,
  apiKey: string
): Promise<DetectionResult> {
  const res = await fetchWithTimeout(
    'https://asr.api.speechmatics.com/v2/jobs/',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'transcription',
        transcription_config: { language: 'auto', enable_entities: false },
        text_input: text,
      }),
    }
  );

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10);
    throw new SpeechmaticsRateLimitError(retryAfter);
  }

  if (!res.ok) {
    throw new SpeechmaticsError(`Language detection failed: ${res.status}`);
  }

  const data = await res.json();
  return {
    language: data.detected_language || 'en',
    confidence: data.confidence || 1.0,
  };
}

export async function translate(
  text: string,
  sourceLang: string,
  targetLang: string,
  apiKey: string
): Promise<TranslationResult> {
  // Skip cache for very long texts
  const useCache = text.length <= 5000;
  const cacheKey = getCacheKey(text, sourceLang, targetLang);

  if (useCache) {
    const cached = await redis.get(cacheKey);
    if (cached) return { translatedText: cached };
  }

  const res = await fetchWithTimeout(`${BASE_URL}/v1/translate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: text,
      source_language: sourceLang,
      target_language: targetLang,
    }),
  });

  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10);
    throw new SpeechmaticsRateLimitError(retryAfter);
  }

  if (!res.ok) {
    throw new SpeechmaticsError(`Translation failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const translatedText: string = data.translation || data.output || '';

  if (useCache && translatedText) {
    await redis.set(cacheKey, translatedText, 'EX', CACHE_TTL_SECONDS);
  }

  return { translatedText };
}
