import { AttachedFile, ComposerMode } from '../components/Composer';
import { PersonalizationConfig } from '../components/PersonalizeDrawer';
import { AnswerSource, ConversationHistoryItem } from '../types/chat';
import { fetchNasaMediaForTopic } from './nasaMediaService';

const RAG_URL = 'https://nobotara-worker.nobotara71.workers.dev';

/** Said when SpaceAI could not get an answer. Never replaced by a made-up one. */
export const UNAVAILABLE_ANSWER =
  "SpaceAI can't answer right now. Please check your internet connection and try again in a minute.";

/** Removes citation numbers like [1] or [1, 2] and a trailing "Sources:" list: sources are shown as links instead. */
export function tidyAnswer(text: string): string {
  return text
    .replace(/\n\s*(?:\*\*)?(?:#+\s*)?Sources?(?:\*\*)?\s*:?(?:\*\*)?\s*\n?(?:\s*(?:[-*]\s*)?(?:\[\d+\]\s*)?\S*https?:\/\/\S+\s*)+$/i, '')
    .replace(/[ \t]?\[[1-9]\d*(?:\s*,\s*[1-9]\d*)*\]/g, '')
    .trim();
}

/**
 * Asks SpaceAI (the Cloudflare Worker: NASA mission passages + Gemini).
 * If it fails, the reply says so plainly: there are no stand-in answers.
 */
export async function generateAIResponse(
  query: string,
  _mode: ComposerMode = 'Normal',
  attachments: AttachedFile[] = [],
  _personalization?: PersonalizationConfig
): Promise<ConversationHistoryItem> {
  const question = query || (attachments.length > 0 ? `Analysis of ${attachments[0].name}` : 'Space question');
  const reply = (fullAnswer: string, extra: Partial<ConversationHistoryItem> = {}): ConversationHistoryItem => ({
    id: `conv-${Date.now()}`,
    question,
    time: 'Just now',
    fullAnswer,
    ...extra,
  });

  try {
    const response = await fetch(`${RAG_URL}/generate`, {
      method: 'POST',
      credentials: 'omit',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify({ query, attachments }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data && typeof data.text === 'string' && data.text.trim()) {
        const sources: AnswerSource[] = Array.isArray(data.sources)
          ? data.sources.filter((src: AnswerSource) => typeof src?.url === 'string' && /^https:\/\//.test(src.url))
          : [];
        // Pictures and sounds from the NASA library, only alongside a real answer.
        const media = await fetchNasaMediaForTopic(query).catch(() => undefined);
        return reply(tidyAnswer(data.text), { sources, media });
      }
    }

    // Asked too often (the worker's per-visitor or overall limit): say so plainly.
    if (response.status === 429) {
      const data = await response.json().catch(() => null);
      const busy = data?.error === 'SpaceAI is busy, try again in a minute';
      return reply(
        `${busy ? 'SpaceAI is busy right now.' : 'You are asking very quickly!'} Please wait a minute, then ask again.`,
        { failed: true }
      );
    }
    console.warn('[SpaceAI] worker answered', response.status);
  } catch (e) {
    console.warn('[SpaceAI] request failed:', e);
  }

  return reply(UNAVAILABLE_ANSWER, { failed: true });
}

/**
 * Streams AI responses chunk-by-chunk via Server-Sent Events from the server-side API proxy.
 */
export async function* streamAIResponse(
  query: string,
  mode: ComposerMode,
  attachments: AttachedFile[],
  personalization: PersonalizationConfig
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${RAG_URL}/stream`, {
    method: 'POST',
    credentials: 'omit',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, mode, attachments, personalization }),
  });

  if (!response.ok || !response.body) {
    throw new Error('Streaming failed on server');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const dataStr = line.slice(6).trim();
        if (dataStr === '[DONE]') return;
        try {
          const parsed = JSON.parse(dataStr);
          if (parsed.text) yield parsed.text;
        } catch (_) {}
      }
    }
  }
}

/**
 * Creates a WebSocket connection to the server-side Live API endpoint (/api/live).
 */
export function createLiveSessionSocket(): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return new WebSocket(`${protocol}//${window.location.host}/api/live`);
}
