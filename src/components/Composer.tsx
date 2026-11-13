import React, { useState, useRef, useEffect } from 'react';
import { 
  Paperclip, 
  Mic,
  ArrowUp, 
  FileText, 
  Camera, 
  Image as GalleryIcon, 
  X, 
  File
} from 'lucide-react';
import { useSpeechInput } from './useSpeechInput';

export type ComposerMode = 'Normal' | 'Brief' | 'Deep Analysis';
export type DeepThinkMode = 'Deep Think' | 'Tax Strategist' | 'Portfolio Rebalance' | 'Analytical Logic';

export interface AttachedFile {
  id: string;
  name: string;
  size: string;
  type: 'document' | 'image';
  previewUrl?: string;
}

interface ComposerProps {
  onSendMessage: (text: string, attachments: AttachedFile[]) => void;
  isLoading?: boolean;
  value?: string;
  onChange?: (val: string) => void;
}

export const Composer: React.FC<ComposerProps> = ({
  onSendMessage,
  isLoading = false,
  value,
  onChange,
}) => {
  const [internalInput, setInternalInput] = useState('');
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(() => {
    if (typeof window !== 'undefined') {
      const m = new URLSearchParams(window.location.search).get('menu');
      if (m === 'open' || m === 'true') return true;
    }
    return false;
  });
  const [attachments, setAttachments] = useState<AttachedFile[]>([]);

  const input = value !== undefined ? value : internalInput;
  const setInput = (val: string) => {
    if (onChange) onChange(val);
    else setInternalInput(val);
  };
  const speech = useSpeechInput(input, setInput);

  const attachMenuRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Close attachment menu on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (attachMenuRef.current && !attachMenuRef.current.contains(e.target as Node)) {
        setShowAttachmentMenu(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAttachmentMenu(false);
      }
    };

    if (showAttachmentMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showAttachmentMenu]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryToSend = input.trim();
    if ((!queryToSend && attachments.length === 0) || isLoading) return;
    speech.stop();
    onSendMessage(queryToSend, attachments);
    setInput('');
    setAttachments([]);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const sizeStr = file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;
      setAttachments((prev) => [
        ...prev,
        {
          id: `file-${Date.now()}`,
          name: file.name,
          size: sizeStr,
          type: 'document',
        },
      ]);
      setShowAttachmentMenu(false);
      e.target.value = '';
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const previewUrl = URL.createObjectURL(file);
      const sizeStr = `${Math.round(file.size / 1024)} KB`;
      setAttachments((prev) => [
        ...prev,
        {
          id: `img-${Date.now()}`,
          name: file.name,
          size: sizeStr,
          type: 'image',
          previewUrl,
        },
      ]);
      setShowAttachmentMenu(false);
      e.target.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="w-full max-w-[640px] mx-auto px-4 sm:px-0">
      {/* Hidden system file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.csv,.json,.md"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageChange}
        className="hidden"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageChange}
        className="hidden"
      />

      {/* Main searchbox container wrapped with Google Gemini rotating aurora lighting effect */}
      <div className="gemini-chatbox-wrap relative">
        {/* Soft, breathing ambient aurora halo behind the box */}
        <div aria-hidden="true" className="gemini-chatbox-halo" />

        {/* Dual-layer background clipping (padding-box + border-box) with obsidian interior #070b15 */}
        <form
          onSubmit={handleSubmit}
          className="gemini-chatbox relative flex flex-col justify-between p-4 sm:p-5 min-h-[148px]"
        >
          {/* Removable file chip badges above the action bar */}
          {attachments.length > 0 && (
            <div className="mb-2.5 flex flex-wrap gap-2 relative z-10">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1 rounded-xl bg-white/[0.06] border border-white/[0.12] text-xs text-white backdrop-blur-md"
                >
                  {att.type === 'image' && att.previewUrl ? (
                    <img
                      src={att.previewUrl}
                      alt={att.name}
                      className="w-4 h-4 rounded object-cover"
                    />
                  ) : (
                    <File className="w-3.5 h-3.5 text-[#38bdf8] shrink-0" />
                  )}
                  <span className="font-medium truncate max-w-[140px]">{att.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({att.size})</span>
                  <button
                    type="button"
                    onClick={() => removeAttachment(att.id)}
                    className="p-0.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors ml-0.5 cursor-pointer"
                    title="Remove attachment"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {speech.problem && (
            <p role="status" className="relative z-10 mb-2 text-[12px] text-amber-300/90">
              {speech.problem}
            </p>
          )}

          {/* Clean transparent textarea with white text and comfortable padding */}
          <div className="relative z-10 w-full flex-1 flex items-start">
            <textarea
              ref={textareaRef}
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="Ask anything about space or our missions…"
              className="w-full resize-none bg-transparent text-white placeholder-slate-400 text-[15px] sm:text-[16px] leading-[1.5] focus:outline-none tracking-normal font-normal p-0 selection:bg-[#38bdf8]/30"
            />
          </div>

          {/* Bottom Action Bar: Paperclip + Mic on left, Rounded cyan gradient submit button on right */}
          <div className="relative z-10 flex items-center justify-between pt-3 select-none">
            {/* Paperclip attachment button & Mic on bottom-left */}
            <div className="flex items-center gap-1 -ml-1">
              <div className="relative flex items-center" ref={attachMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowAttachmentMenu((prev) => !prev)}
                  title="Add attachment"
                  className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] flex items-center justify-center text-slate-300 transition-all duration-150 active:scale-95 cursor-pointer"
                >
                  <Paperclip className="w-4 h-4 -rotate-45" />
                </button>

                {/* Minimal floating obsidian glass menu positioned downward directly below the button */}
                {showAttachmentMenu && (
                  <div
                    className="absolute left-0 top-full mt-2 z-50 min-w-[170px] rounded-2xl bg-[#0c101c]/98 backdrop-blur-2xl border border-white/[0.08] shadow-[0_16px_36px_rgba(0,0,0,0.85)] p-1.5 flex flex-col gap-0.5"
                  >
                    {/* Row 1: Files */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachmentMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[13px] font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Files</span>
                    </button>

                    {/* Row 2: Camera */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachmentMenu(false);
                        cameraInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[13px] font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      <Camera className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Camera</span>
                    </button>

                    {/* Row 3: Gallery */}
                    <button
                      type="button"
                      onClick={() => {
                        setShowAttachmentMenu(false);
                        galleryInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-[13px] font-medium text-slate-200 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                    >
                      <GalleryIcon className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>Gallery</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Speak your question (browser speech-to-text; hidden where the browser has none) */}
              {speech.supported && (
                <button
                  type="button"
                  onClick={speech.toggle}
                  title={speech.listening ? 'Stop listening' : 'Speak your question'}
                  aria-label={speech.listening ? 'Stop listening' : 'Speak your question'}
                  aria-pressed={speech.listening}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 cursor-pointer ${
                    speech.listening ? 'text-[#38bdf8] bg-sky-500/20 animate-pulse' : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
              )}
              {speech.listening && (
                <span className="ml-1 text-[11px] text-sky-300/90" aria-live="polite">
                  Listening…
                </span>
              )}
            </div>

            {/* Bottom-right: Rounded cyan gradient submit button with an upward arrow */}
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && attachments.length === 0)}
              title="Send"
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#22d3ee] hover:bg-[#38bdf8] text-slate-950 font-bold active:scale-95 shadow-[0_0_18px_rgba(34,211,238,0.55)] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4 stroke-[2.8]" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
