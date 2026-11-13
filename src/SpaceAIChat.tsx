/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, ExternalLink, Play, Pause, Volume2, RotateCcw } from 'lucide-react';
import { CassiniSaturnHero } from './components/CassiniSaturnHero';
import { Composer, AttachedFile } from './components/Composer';
import { generateAIResponse, UNAVAILABLE_ANSWER } from './services/aiAdvisor';
import { NasaLiveUpdatesModal } from './components/NasaLiveUpdatesModal';
import { PolicyModal } from './components/PolicyModal';
import { AnswerSource, ConversationHistoryItem } from './types/chat';

interface SpaceAIChatProps {
  onBack: () => void;
  activeMissionLabel?: string;
  onPlaySfx?: () => void;
}

type Stage = 'recalling' | 'thinking';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  recalled?: boolean;
  media?: ConversationHistoryItem['media'];
  sources?: AnswerSource[];
  /** SpaceAI could not answer: shown as a notice with Try again (retry asks this question). */
  retry?: string;
}

const PRESET_PILLS = [
  'Why did Apollo 11 leave half its lander on the Moon?',
  "What is on Voyager 1's Golden Record?",
  'Why does Perseverance collect rocks on Mars?',
];

const MISSION_NAMES: Record<string, string> = {
  apollo11: 'Apollo 11',
  voyager1: 'Voyager 1',
  msr: 'Mars Sample Return',
  marssamplereturn: 'Mars Sample Return',
};

/** "Apollo 11 · nssdc.gsfc.nasa.gov" for a source link. */
function sourceLabel(src: AnswerSource) {
  let host = src.url;
  try {
    host = new URL(src.url).hostname.replace(/^www\./, '');
  } catch {}
  const key = (src.mission ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const mission = MISSION_NAMES[key] ?? src.mission;
  return mission ? `${mission} · ${host}` : host;
}

const ARTEMIS_Q = 'Why is NASA targeting the lunar South Pole for Artemis water ice extraction?';

const qp = (k: string) =>
  typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get(k) : null;

const uid = () => Math.random().toString(36).slice(2);

const fmt = (s: number) =>
  `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const MD = `
  text-[15px] leading-[1.75] text-slate-200
  [&_strong]:font-bold [&_strong]:text-white [&_em]:italic
  [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-6 [&_h1]:mb-3
  [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-5 [&_h2]:mb-2
  [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-4 [&_h3]:mb-2
  [&_p]:mb-4 [&_p:last-child]:mb-0
  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3 [&_li]:my-1
  [&_a]:text-sky-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-sky-300
  [&_blockquote]:border-l-2 [&_blockquote]:border-sky-400/50 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400 [&_blockquote]:my-3
  [&_code]:bg-white/10 [&_code]:text-sky-300 [&_code]:px-1 [&_code]:rounded
  [&_pre]:bg-black/40 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto
  [&_hr]:border-white/10 [&_hr]:my-5
  [&_table]:w-full [&_table]:text-sm [&_table]:my-4
  [&_th]:text-white [&_th]:font-semibold [&_th]:text-left [&_th]:p-2 [&_th]:border-b [&_th]:border-white/20
  [&_td]:p-2 [&_td]:border-b [&_td]:border-white/10
`;

function SaturnMark({ className = '' }: { className?: string }) {
  return (
    <svg className={`${className} -scale-x-100`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="5.5" className="stroke-[#60A5FA]" strokeWidth="1.6" />
      <ellipse
        cx="12"
        cy="12"
        rx="10.5"
        ry="3.6"
        transform="rotate(-24 12 12)"
        className="stroke-[#38bdf8]"
        strokeWidth="1.5"
      />
    </svg>
  );
}

/** Claude-style status chip: spinner while working, checkmark once done. */
function StatusChip({
  stage,
  done,
  reducedMotion,
}: {
  stage?: Stage;
  done?: boolean;
  reducedMotion: boolean;
}) {
  const label = done
    ? 'Recalled from mission archives'
    : stage === 'recalling'
      ? 'Recalling mission archives…'
      : 'Thinking…';
  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-slate-400 font-mono select-none self-start">
      {done ? (
        <svg className="w-3.5 h-3.5 text-[#38bdf8]" viewBox="0 0 16 16" fill="none">
          <path
            d="M3.5 8.5l3 3 6-6.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <span
          className={`w-1.5 h-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_6px_#38bdf8] ${
            reducedMotion ? '' : 'animate-pulse'
          }`}
        />
      )}
      <span className={!done && !reducedMotion ? 'animate-pulse' : ''}>{label}</span>
    </div>
  );
}

/** Markdown text + image/video card + audio player + source/copy row. */
function MessageBody({
  text,
  media,
  sources = [],
}: {
  text: string;
  media?: ConversationHistoryItem['media'];
  sources?: AnswerSource[];
}) {
  const visual = media?.visual;
  const audio = media?.audio;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPlaying(false);
    setTime(0);
    setDur(0);
  }, [audio?.audioUrl]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };

  return (
    <div className="flex flex-col gap-4">
      <div className={MD}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a: ({ node, ...p }) => <a {...p} target="_blank" rel="noopener noreferrer" />,
          }}
        >
          {text}
        </ReactMarkdown>
      </div>

      {visual && (
        <section className="rounded-2xl overflow-hidden border border-white/10 bg-[#0a0f1d]/85">
          <div className="relative w-full h-[240px] sm:h-[320px] bg-black">
            {visual.type === 'video' ? (
              <video
                key={visual.url}
                src={visual.url}
                poster={visual.previewUrl}
                controls
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                key={visual.url}
                src={visual.url}
                alt={visual.title}
                className="w-full h-full object-cover"
              />
            )}
            <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-mono text-slate-200 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] shadow-[0_0_6px_#06b6d4]" />
              {visual.center || 'NASA'}
            </span>
          </div>
          <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between gap-4 flex-wrap">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-white truncate">{visual.title}</h3>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                {[visual.center, visual.dateCreated, `ID: ${visual.nasaId}`].filter(Boolean).join(' • ')}
              </p>
            </div>
            <a
              href={`https://images.nasa.gov/details/${encodeURIComponent(visual.nasaId)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-slate-200 hover:text-white transition shrink-0"
            >
              NASA Image Library <ExternalLink className="w-3 h-3 text-[#38bdf8]" />
            </a>
          </div>
        </section>
      )}

      {audio && (
        <section className="rounded-2xl bg-[#090d16]/80 border border-white/[0.08] p-3.5 select-none">
          <audio
            key={audio.audioUrl}
            ref={audioRef}
            src={audio.audioUrl}
            preload="metadata"
            onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false);
              setTime(0);
            }}
          />
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={toggle}
              title={playing ? 'Pause' : 'Play'}
              className="w-9 h-9 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center shadow-[0_0_14px_rgba(6,182,212,0.4)] active:scale-95 transition shrink-0 cursor-pointer"
            >
              {playing ? (
                <Pause className="w-4 h-4 fill-slate-950" />
              ) : (
                <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between gap-3 mb-1.5">
                <span className="text-xs font-medium text-white truncate">{audio.title}</span>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0">
                  {fmt(time)} / {dur ? fmt(dur) : '--:--'}
                </span>
              </div>
              <div
                className="w-full h-1.5 rounded-full bg-slate-700/60 overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const a = audioRef.current;
                  if (!a || !dur) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  a.currentTime = ((e.clientX - r.left) / r.width) * dur;
                }}
              >
                <div
                  className="h-full bg-cyan-400"
                  style={{ width: dur ? `${(time / dur) * 100}%` : '0%' }}
                />
              </div>
            </div>
            <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>
        </section>
      )}

      <div className="flex items-center gap-2 flex-wrap select-none">
        {sources.length > 0 && <span className="text-[11px] font-mono text-slate-500">Sources</span>}
        {sources.map((src) => (
          <a
            key={src.url}
            href={src.url}
            target="_blank"
            rel="noopener noreferrer"
            title={src.url}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-[11px] font-mono text-[#38bdf8] transition max-w-full"
          >
            <span className="truncate">{sourceLabel(src)}</span> <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
        ))}
        <button
          type="button"
          title="Copy"
          onClick={() => {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-white transition cursor-pointer"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-[#38bdf8]" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export default function SpaceAIChat({ onBack, onPlaySfx }: SpaceAIChatProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const v = qp('view');
    if (v === 'response' || v === 'analysis') {
      return [
        { id: 'demo-u', role: 'user', text: ARTEMIS_Q },
        {
          id: 'demo-a',
          role: 'assistant',
          recalled: true,
          text: "NASA's Artemis program targets the Lunar South Pole because it hosts geological conditions found nowhere else on the Moon: deep, permanently shadowed impact craters that act as cosmic cold traps, maintaining constant temperatures as low as 40 K (−233°C) for over two billion years.",
        },
      ];
    }
    return [];
  });
  const [isLoading, setIsLoading] = useState(false);
  const [stage, setStage] = useState<Stage>('recalling');
  const [promptText, setPromptText] = useState(() => qp('text') || qp('q') || '');
  const [showLiveUpdates, setShowLiveUpdates] = useState(() => qp('live') === 'true');
  const [showPolicy, setShowPolicy] = useState(() => {
    const p = qp('modal') || qp('policy');
    return p === 'policy' || p === 'true';
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const hasThread = messages.length > 0 || isLoading;

  // ?ask=... opens a thread directly
  useEffect(() => {
    const ask = qp('ask');
    if (ask) handleSendMessage(ask === 'artemis' ? ARTEMIS_Q : ask, []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // prefers-reduced-motion
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) setReducedMotion(true);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // auto-scroll on new content
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [messages, isLoading, stage, reducedMotion]);

  const handleBack = () => {
    onPlaySfx?.();
    if (hasThread) {
      setMessages([]);
      return;
    }
    onBack();
  };

  const handleSendMessage = async (text: string, attachments: AttachedFile[] = [], isRetry = false) => {
    if (!text.trim() && attachments.length === 0) return;
    if (isLoading) return;
    // Try again replaces the "can't answer" notice instead of repeating the question.
    if (isRetry) setMessages((m) => m.filter((msg) => msg.retry !== text));
    else setMessages((m) => [...m, { id: uid(), role: 'user', text }]);
    setPromptText('');
    setStage('recalling');
    setIsLoading(true);
    // Fallback stage progression. Replace with real signals from aiAdvisor.
    const t = setTimeout(() => setStage('thinking'), 1400);
    try {
      const res = await generateAIResponse(text, 'Brief', attachments);
      setMessages((m) => [
        ...m,
        res.failed
          ? { id: uid(), role: 'assistant', text: res.fullAnswer, retry: text }
          : {
              id: uid(),
              role: 'assistant',
              text: res.fullAnswer,
              media: res.media,
              sources: res.sources,
              recalled: true,
            },
      ]);
    } catch (err) {
      console.error('Failed to generate SpaceAI response:', err);
      setMessages((m) => [...m, { id: uid(), role: 'assistant', text: UNAVAILABLE_ANSWER, retry: text }]);
    } finally {
      clearTimeout(t);
      setIsLoading(false);
    }
  };

  const handlePillClick = (pillText: string) => {
    handleSendMessage(pillText.replace(/^Try:\s*/, ''), []);
  };

  const composer = (
    <Composer
      onSendMessage={handleSendMessage}
      isLoading={isLoading}
      value={promptText}
      onChange={setPromptText}
    />
  );

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black text-[#F8FAFC] select-text selection:bg-[#38bdf8]/30 selection:text-white">
      <NasaLiveUpdatesModal
        isOpen={showLiveUpdates}
        onClose={() => setShowLiveUpdates(false)}
        onAskSpaceAI={(query) => handleSendMessage(query, [])}
      />
      <PolicyModal isOpen={showPolicy} onClose={() => setShowPolicy(false)} onPlaySfx={onPlaySfx} />

      {/* Header */}
      <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-3 relative z-30 select-none shrink-0">
        <div className="w-full bg-[#0a0f1d]/70 backdrop-blur-md border border-white/5 rounded-2xl px-5 sm:px-6 py-3 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
          <div className="inline-flex items-center gap-2">
            <span className="text-[17px] tracking-tight flex items-center">
              <span className="font-bold text-white">Space</span>
              <span className="font-bold text-[#38bdf8]">AI</span>
            </span>
            <SaturnMark className="w-5 h-5 shrink-0" />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowLiveUpdates(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 text-xs font-mono font-medium transition cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.2)] active:scale-95"
              title="View NASA Live Telemetry Updates"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b] ${
                  reducedMotion ? '' : 'animate-pulse'
                }`}
              />
              Live
            </button>
            <button
              type="button"
              onClick={handleBack}
              className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors cursor-pointer px-1 py-0.5"
            >
              {hasThread ? 'New chat' : 'Home'}
            </button>
          </div>
        </div>
      </header>

      {hasThread ? (
        <>
          {/* Thread */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="w-full max-w-2xl mx-auto px-4 py-6 flex flex-col gap-8">
              {messages.map((m) =>
                m.role === 'user' ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-white/[0.07] border border-white/[0.06] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
                      {m.text}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex gap-3 items-start">
                    <div className="mt-0.5 w-7 h-7 shrink-0 rounded-full bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex items-center justify-center">
                      <SaturnMark className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col gap-3">
                      {m.retry !== undefined ? (
                        <div role="status" className="flex flex-col items-start gap-3 rounded-2xl border border-amber-400/25 bg-amber-500/[0.06] px-4 py-3">
                          <p className="text-[15px] leading-relaxed text-amber-100/90">{m.text}</p>
                          <button
                            type="button"
                            onClick={() => handleSendMessage(m.retry!, [], true)}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-white transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Try again
                          </button>
                        </div>
                      ) : (
                        <>
                          {m.recalled && <StatusChip done reducedMotion={reducedMotion} />}
                          <MessageBody text={m.text} media={m.media} sources={m.sources} />
                        </>
                      )}
                    </div>
                  </div>
                )
              )}

              {isLoading && (
                <div className="flex gap-3 items-start">
                  <div className="mt-0.5 w-7 h-7 shrink-0 rounded-full bg-[#38bdf8]/10 border border-[#38bdf8]/20 flex items-center justify-center">
                    <SaturnMark className="w-4 h-4" />
                  </div>
                  <StatusChip stage={stage} reducedMotion={reducedMotion} />
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          </main>

          {/* Docked composer */}
          <div className="shrink-0 w-full max-w-2xl mx-auto px-4 pb-3 pt-2">
            {composer}
            <p className="mt-2 text-center text-[11px] text-slate-600 font-mono">
              SpaceAI can make mistakes. Verify mission data against NASA sources.
            </p>
          </div>
        </>
      ) : (
        <main className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-4 py-4 sm:py-6">
          <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
            <div className="flex justify-center w-full">
              <CassiniSaturnHero reducedMotion={reducedMotion} />
            </div>
            <h1
              className="mt-[22px] text-center font-semibold text-white tracking-tight text-[28px] sm:text-[32px] select-none"
              style={{ textWrap: 'balance' }}
            >
              What&apos;d you like to explore?
            </h1>
            <div className="w-full mt-6 sm:mt-7">{composer}</div>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 select-none px-2 max-w-xl">
              {PRESET_PILLS.map((pill) => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => handlePillClick(pill)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-medium text-slate-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] hover:border-white/[0.18] transition-all cursor-pointer backdrop-blur-md active:scale-98"
                >
                  {pill}
                </button>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* Footer (landing only) */}
      {!hasThread && (
        <footer className="w-full py-4 text-center select-none shrink-0">
          <p className="text-xs text-slate-500 font-mono tracking-wider flex items-center justify-center gap-2">
            <span>NOBOTARA71</span>
            <span>•</span>
            <span>SpaceAi</span>
            <span>•</span>
            <button
              type="button"
              onClick={() => setShowPolicy(true)}
              className="hover:text-slate-300 underline underline-offset-4 decoration-white/20 hover:decoration-cyan-400 transition-colors cursor-pointer"
            >
              Policy
            </button>
            <span>•</span>
            <span>Gemini 3.8 Flash</span>
          </p>
        </footer>
      )}
    </div>
  );
}