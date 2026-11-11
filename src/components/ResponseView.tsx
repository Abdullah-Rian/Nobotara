import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  ArrowLeft, 
  Copy, 
  Check, 
  ExternalLink, 
  Play, 
  Pause, 
  Volume2,
  Paperclip, 
  Mic, 
  ArrowUp, 
  FileText, 
  Camera, 
  Image as GalleryIcon, 
  X,
  File
} from 'lucide-react';
import { ConversationHistoryItem } from '../types/chat';

interface ResponseViewProps {
  conversation: ConversationHistoryItem;
  onBack: () => void;
  onFollowUp?: (query: string) => void;
  onOpenLiveUpdates?: () => void;
}



export const ResponseView: React.FC<ResponseViewProps> = ({
  conversation,
  onBack,
  onFollowUp,
  onOpenLiveUpdates,
}) => {
  const [copied, setCopied] = useState(false);
  const [followUpText, setFollowUpText] = useState('');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isMicActive, setIsMicActive] = useState(false);
  const [attachments, setAttachments] = useState<{ id: string; name: string }[]>([]);

  const visual = conversation.media?.visual;
  const audio = conversation.media?.audio;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [audio?.audioUrl]);

  const togglePlayAudio = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  };
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Close attachment popover on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowAttachMenu(false);
    };
    if (showAttachMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAttachMenu]);

  // Copy analysis to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(`${conversation.question}\n\n${conversation.fullAnswer}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format time mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

 

  // Handle follow up submit
  const handleFollowUpSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!followUpText.trim()) return;
    onFollowUp?.(followUpText.trim());
    setFollowUpText('');
    setAttachments([]);
  };

  // Parse conversation.fullAnswer or synthesize into two structured pillars (Volatiles & ISRU)
  const isArtemisOrMoon = conversation.question.toLowerCase().includes('artemis') ||
    conversation.question.toLowerCase().includes('south pole') ||
    conversation.question.toLowerCase().includes('water ice') ||
    conversation.question.toLowerCase().includes('ice');

  // Scientific structure data
  const synthesisLead = conversation.fullAnswer;

  const pillar1Title = isArtemisOrMoon ? "VOLATILES & WATER ICE" : "PLANETARY GEOLOGY & DYNAMICS";
  const pillar1Body = isArtemisOrMoon
    ? "Spectrometric data from LRO and LCROSS impact confirmed billions of kilograms of water ice locked in crater regolith."
    : "Spectrometric multi-wavelength telemetry indicates stable crustal volatiles and distinct mineralogical formations.";

  const pillar2Title = isArtemisOrMoon ? "IN-SITU RESOURCE UTILIZATION (ISRU)" : "MISSION TRAJECTORY & PAYLOAD";
  const pillar2Body = isArtemisOrMoon
    ? "Splitting water (2H₂O → 2H₂ + O₂) yields liquid hydrogen rocket propellant and breathing oxygen for sustained crewed hubs."
    : "Autonomous guidance and propulsive energy cycles deliver sustained mission telemetry across deep-space checkpoints.";

  const conclusionText = isArtemisOrMoon
    ? "Simultaneously, elevated crater rims experience peaks of eternal light (~86–94% solar illumination) for uninterrupted solar power."
    : "Continuous observational corroboration from deep space probes guarantees high-fidelity ephemeris synchronization.";

  return (
    <div className="w-full max-w-4xl mx-auto px-3 sm:px-6 pt-3 pb-8 select-text animate-in fade-in duration-300">
      {/* 1. Brand Lockup & Top Navbar: Mirrored Saturn icon, ← Return button, Live pill, Gemini badge */}
      <header className="w-full bg-[#0a0f1d]/80 backdrop-blur-md border border-white/5 rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.5)] mb-6 select-none">
        {/* Left: SpaceAI Title + Mirrored Saturn Icon + Gemini Badge + Return to SpaceAI button */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <div className="inline-flex items-center gap-2 select-none">
            <span className="text-[17px] tracking-tight flex items-center">
              <span className="font-bold text-white">Space</span>
              <span className="font-bold text-[#38bdf8]">AI</span>
            </span>
            <svg
              className="w-5 h-5 text-[#38bdf8] shrink-0 -scale-x-100"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
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
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/25 text-[#38bdf8] text-xs font-mono font-medium shadow-[0_0_10px_rgba(56,189,248,0.15)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] shadow-[0_0_6px_#38bdf8] animate-pulse" />
            Gemini 3.8 Flash
          </span>

          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-white/20 text-xs text-slate-300 hover:text-white transition-all cursor-pointer backdrop-blur-md"
            title="Back to exploration deck"
          >
            <ArrowLeft className="w-3 h-3 text-[#38bdf8]" />
            <span>Return to SpaceAI</span>
          </button>
        </div>

        {/* Right: Live indicator, Home link, Copy icon, Just now */}
        <div className="flex items-center gap-3 select-none">
          <button
            type="button"
            onClick={onOpenLiveUpdates}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 text-xs font-mono font-medium transition cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.2)] active:scale-95"
            title="View NASA Live Telemetry Updates"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b] animate-pulse" />
            Live
          </button>

          <button
            type="button"
            onClick={onBack}
            className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors cursor-pointer px-1 py-0.5"
          >
            Home
          </button>

          <button
            type="button"
            onClick={handleCopy}
            className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer"
            title="Copy Analysis"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#38bdf8]" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          <span className="text-xs font-mono text-slate-500 hidden sm:inline-block">
            Just now
          </span>
        </div></header>

      {/* 2. Primary Scientific Answer Card */}
      <article className="rounded-2xl bg-[#0a0f1d]/85 backdrop-blur-2xl border border-white/10 p-6 sm:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] relative overflow-hidden mb-5">
        {/* Top Eyebrow */}
        <div className="text-[11px] font-mono font-semibold tracking-wider text-[#38bdf8] uppercase mb-2">
          CELESTIAL INQUIRY ANALYZED
        </div>

        {/* High-Contrast Bold Query Title */}
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-snug mb-4">
          {conversation.question}
        </h1>

        {/* Verified Source Box per design */}
        <div className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-4 py-2.5 flex items-center justify-between gap-3 mb-5">
          <div className="text-xs font-mono font-semibold text-slate-400 tracking-wider uppercase">
            VERIFIED SOURCE
          </div>
          <a
            href="https://www.nasa.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-xs font-semibold text-[#38bdf8] hover:text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(56,189,248,0.15)]"
          >
            <span className="text-red-400 text-xs">🚀</span>
            <span>NASA Official Archive</span>
            <ExternalLink className="w-3 h-3 text-[#38bdf8]" />
          </a>
        </div>

        {/* Authoritative Scientific Synthesis Lead Paragraph */}
        <div className="
          text-[14.5px] sm:text-[15px] text-slate-200 leading-relaxed mb-5
          [&_strong]:font-bold [&_strong]:text-white
          [&_em]:italic
          [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-6 [&_h1]:mb-3
          [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-white [&_h2]:mt-5 [&_h2]:mb-2
          [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-4 [&_h3]:mb-2
          [&_p]:mb-4
          [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3
          [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3
          [&_li]:pl-1 [&_li]:my-1
          [&_a]:text-sky-400 [&_a]:underline [&_a]:underline-offset-2
          [&_blockquote]:border-l-2 [&_blockquote]:border-sky-400/50 [&_blockquote]:pl-4 [&_blockquote]:text-slate-400 [&_blockquote]:my-3
          [&_code]:bg-white/10 [&_code]:text-sky-300 [&_code]:px-1 [&_code]:rounded
          [&_pre]:bg-black/40 [&_pre]:p-4 [&_pre]:rounded-xl [&_pre]:overflow-x-auto
          [&_hr]:border-white/10 [&_hr]:my-5
          [&_table]:w-full [&_table]:text-sm [&_table]:my-4
          [&_th]:text-white [&_th]:font-semibold [&_th]:text-left [&_th]:p-2 [&_th]:border-b [&_th]:border-white/20
          [&_td]:p-2 [&_td]:border-b [&_td]:border-white/10
        ">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {synthesisLead}
          </ReactMarkdown>
        </div>

        {/* Clean Numbered Micro-Cards (01 // Volatiles, 02 // ISRU) */}
        <div className="hidden">
          {/* Card 01 */}
          <div className="p-4 rounded-xl bg-white/[0.025] hover:bg-white/[0.04] border border-white/[0.07] hover:border-[#38bdf8]/30 transition-all flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-1.5 py-0.5 rounded bg-[#38bdf8]/15 border border-[#38bdf8]/30 text-[#38bdf8] font-mono text-[10px] font-bold">
                01
              </span>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                {pillar1Title}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {pillar1Body}
            </p>
          </div>

          {/* Card 02 */}
          <div className="p-4 rounded-xl bg-white/[0.025] hover:bg-white/[0.04] border border-white/[0.07] hover:border-[#38bdf8]/30 transition-all flex flex-col justify-between">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-1.5 py-0.5 rounded bg-[#38bdf8]/15 border border-[#38bdf8]/30 text-[#38bdf8] font-mono text-[10px] font-bold">
                02
              </span>
              <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-300">
                {pillar2Title}
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {pillar2Body}
            </p>
          </div>
        </div>

        {/* Concluding Takeaway */}
        <p className="hidden">
          {conclusionText}
        </p></article>

      {visual && (
        <section className="rounded-2xl bg-[#0a0f1d]/85 backdrop-blur-2xl border border-white/10 overflow-hidden relative shadow-[0_20px_50px_rgba(0,0,0,0.6)] mb-5">
          <div className="relative w-full h-[260px] sm:h-[340px] bg-black overflow-hidden flex items-center justify-center">
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
            <div className="absolute top-3.5 left-3.5">
              <span className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-mono text-slate-200 flex items-center gap-1.5 shadow-lg">
                <span className="w-1.5 h-1.5 rounded-full bg-[#06b6d4] shadow-[0_0_6px_#06b6d4]" />
                {visual.center || 'NASA'}
              </span>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-white/10 bg-[#070b15]/90 flex items-center justify-between gap-4 flex-wrap">
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs text-slate-200 hover:text-white transition-all cursor-pointer shrink-0"
            >
              <span>NASA Image Library</span>
              <ExternalLink className="w-3 h-3 text-[#38bdf8]" />
            </a>
          </div>
        </section>
      )}

      {audio && (
        <section className="rounded-2xl bg-[#090d16]/80 backdrop-blur-xl border border-white/[0.08] p-3.5 sm:px-4 shadow-[0_12px_32px_rgba(0,0,0,0.5)] mb-5 select-none">
          <audio
            key={audio.audioUrl}
            ref={audioRef}
            src={audio.audioUrl}
            preload="metadata"
            onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
            onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => { setIsPlaying(false); setCurrentTime(0); }}
          />
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              onClick={togglePlayAudio}
              className="w-9 h-9 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 flex items-center justify-center shadow-[0_0_14px_rgba(6,182,212,0.4)] active:scale-95 transition-all cursor-pointer shrink-0"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-slate-950" />
              ) : (
                <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
              )}
            </button>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className="text-xs font-medium text-white truncate">{audio.title}</span>
                <span className="text-[11px] font-mono text-slate-400 tabular-nums shrink-0 font-medium">
                  {formatTime(currentTime)} / {duration ? formatTime(duration) : '--:--'}
                </span>
              </div>
              <div
                className="w-full h-1.5 rounded-full bg-slate-700/60 overflow-hidden cursor-pointer"
                onClick={(e) => {
                  const a = audioRef.current;
                  if (!a || !duration) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  a.currentTime = ((e.clientX - r.left) / r.width) * duration;
                }}
              >
                <div
                  className="h-full bg-cyan-400"
                  style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                />
              </div>
            </div>

            <Volume2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          </div>
        </section>
      )}

      {/* 6. Google Gemini Signature Lighting Follow-Up Chatbox */}
      <div className="gemini-chatbox-wrap relative w-full mb-6">
        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt,.csv,.json,.md"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              setAttachments((prev) => [...prev, { id: `${Date.now()}`, name: e.target.files![0].name }]);
              setShowAttachMenu(false);
            }
          }}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              setAttachments((prev) => [...prev, { id: `${Date.now()}`, name: e.target.files![0].name }]);
              setShowAttachMenu(false);
            }
          }}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files?.[0]) {
              setAttachments((prev) => [...prev, { id: `${Date.now()}`, name: e.target.files![0].name }]);
              setShowAttachMenu(false);
            }
          }}
          className="hidden"
        />

        {/* Soft, breathing ambient aurora halo behind the box */}
        <div aria-hidden="true" className="gemini-chatbox-halo" />

        {/* Dual-layer background clipping with obsidian interior #070b15 */}
        <form
          onSubmit={handleFollowUpSubmit}
          className="gemini-chatbox relative flex flex-col justify-between p-4 sm:p-5 min-h-[110px]"
        >
          {/* Removable file chips if present */}
          {attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.08] border border-white/10 text-xs text-white"
                >
                  <File className="w-3 h-3 text-[#38bdf8]" />
                  <span className="truncate max-w-[150px]">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachments((prev) => prev.filter((a) => a.id !== att.id))}
                    className="p-0.5 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Clean transparent textarea with white text */}
          <div className="relative z-10 w-full flex-1">
            <textarea
              rows={2}
              value={followUpText}
              onChange={(e) => setFollowUpText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleFollowUpSubmit();
                }
              }}
              placeholder="Ask a follow-up question regarding Artemis, lunar ice, or mission trajectory..."
              className="w-full resize-none bg-transparent text-white placeholder-slate-400 text-[14.5px] leading-relaxed focus:outline-none p-0 selection:bg-[#38bdf8]/30"
            />
          </div>

          {/* Action Toolbar */}
          <div className="relative z-10 flex items-center justify-between pt-2 select-none">
            {/* Left: Paperclip + Mic */}
            <div className="flex items-center gap-1">
              <div className="relative" ref={attachMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowAttachMenu((prev) => !prev)}
                  title="Add attachment"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                >
                  <Paperclip className="w-4 h-4 -rotate-45" />
                </button>

                {/* Ultra-minimal 3-item dropdown menu */}
                {showAttachMenu && (
                  <div className="absolute left-0 bottom-full mb-2 z-50 min-w-[160px] rounded-2xl bg-[#131722]/98 backdrop-blur-2xl border border-white/[0.08] shadow-2xl p-1.5 flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-[13px] font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Files</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        cameraInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-[13px] font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Camera</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachMenu(false);
                        galleryInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left text-[13px] font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      <GalleryIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Gallery</span>
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsMicActive((prev) => !prev);
                }}
                title={isMicActive ? "Stop listening" : "Voice inquiry"}
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                  isMicActive ? 'text-[#38bdf8] bg-sky-500/20 animate-pulse' : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            {/* Right: Rounded cyan gradient submit button */}
            <button
              type="submit"
              disabled={!followUpText.trim()}
              title="Send Follow-up"
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-r from-[#06b6d4] to-[#38bdf8] text-slate-950 hover:brightness-110 active:scale-95 shadow-[0_0_14px_rgba(6,182,212,0.4)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </form>
      </div>

      {/* 7. Quiet Footer */}
      <footer className="w-full py-4 text-center select-none">
        <p className="text-xs text-slate-500 font-mono tracking-wider">
          NOBOTARA71 • SpaceAi • Gemini 3.8 Flash
        </p>
      </footer>
    </div>
  );
};
