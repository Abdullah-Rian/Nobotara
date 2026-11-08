import React, { useState } from 'react';
import { ArrowLeft, X, ArrowRight } from 'lucide-react';

export interface FaqItem {
  id: string;
  title: string;
  content: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'what-is-nobotara71',
    title: "What's Nobotara71?",
    content:
      'Nobotara71 is an interactive space exploration platform created for the NASA Space Apps Challenge 2026. It includes 3 games and a dedicated Ai named SpaceAi.',
  },
  {
    id: 'what-are-the-games',
    title: 'What are the games?',
    content:
      'The three on Nobotara71 are interactive 3D NASA mission simulation games based on real data featuring:\n • Apollo 11, "ONE GIANT LEAP"\n • Mars Sample Return, "THE LOST DREAM"\n • Voyager 1, "The Golden Disk"',
  },
  {
    id: 'what-is-spaceai',
    title: "What's SpaceAi?",
    content:
      "SpaceAI is an AI assistant designed for learning about space. It delivers concise scientific answers and provides authentic NASA imagery and audio. It's also capable of generating scientifically accurate images using NASA databases.",
  },
];

interface FaqModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaySfx?: () => void;
}

export const FaqModal: React.FC<FaqModalProps> = ({
  isOpen,
  onClose,
  onPlaySfx,
}) => {
  const [selectedFaq, setSelectedFaq] = useState<FaqItem | null>(() => {
    if (typeof window !== 'undefined') {
      const f = new URLSearchParams(window.location.search).get('faq');
      if (f) return FAQ_ITEMS.find((item) => item.id === f) || null;
    }
    return null;
  });

  if (!isOpen) return null;

  const handleSelectFaq = (faq: FaqItem) => {
    onPlaySfx?.();
    setSelectedFaq(faq);
  };

  const handleBack = () => {
    onPlaySfx?.();
    setSelectedFaq(null);
  };

  const handleClose = () => {
    onPlaySfx?.();
    setSelectedFaq(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex items-center justify-center p-3 sm:p-7 select-text animate-in fade-in duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Compact Outer Panel matching near-black theme (zero white glow) */}
      <div
        className="relative w-full max-w-[490px] p-6 sm:p-7 flex flex-col overflow-hidden rounded-[26px] border border-white/[0.17] select-none text-[#f5f5f5]"
        style={{
          background: 'linear-gradient(145deg, rgba(25,26,29,0.98), rgba(14,15,17,0.99) 62%)',
          boxShadow: '0 32px 100px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.055)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {!selectedFaq ? (
          /* ================= VIEW 1: FAQ TITLES LIST ================= */
          <div className="relative z-10">
            {/* Minimal Header */}
            <header className="flex items-center justify-between gap-4 pb-5 mb-5 border-b border-white/[0.095] shrink-0">
              <h1 className="m-0 text-[19px] sm:text-[21px] font-bold tracking-[-0.03em] text-[#ffffff] leading-snug">
                Frequently Asked Questions
              </h1>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close FAQ panel"
                className="w-[36px] h-[36px] rounded-full grid place-items-center border border-white/[0.17] text-[#e8e8ea] bg-white/[0.035] hover:bg-white/[0.11] hover:border-white/[0.35] transition-all cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </header>

            {/* Title Buttons Stack (Only Titles) */}
            <section className="space-y-2.5" aria-label="FAQ Topics">
              {FAQ_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectFaq(item)}
                  className="w-full group p-4 rounded-[15px] border border-white/[0.095] hover:border-white/25 transition-all flex items-center justify-between text-left cursor-pointer active:scale-[0.99]"
                  style={{
                    background: 'linear-gradient(110deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))',
                  }}
                >
                  <span className="text-[14px] font-semibold text-[#f1f1f2] group-hover:text-white transition-colors">
                    {item.title}
                  </span>
                  <ArrowRight className="w-4 h-4 text-[#737780] group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-3" />
                </button>
              ))}
            </section>
          </div>
        ) : (
          /* ================= VIEW 2: DETAIL SUB-POPUP ================= */
          <div className="relative z-10 animate-in fade-in zoom-in-95 duration-150">
            {/* Sub-Header with Back Button */}
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.095]">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-xs text-slate-200 hover:text-white transition cursor-pointer font-medium"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-300" />
                <span>Back</span>
              </button>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close FAQ panel"
                className="w-[36px] h-[36px] rounded-full grid place-items-center border border-white/[0.17] text-[#e8e8ea] bg-white/[0.035] hover:bg-white/[0.11] hover:border-white/[0.35] transition-all cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Question Title */}
            <h2 className="text-[18px] sm:text-[19px] font-bold text-white tracking-tight mb-3">
              {selectedFaq.title}
            </h2>

            {/* Answer Content Box */}
            <div className="p-4 rounded-[15px] bg-white/[0.03] border border-white/[0.08]">
              <p className="text-[13px] text-slate-200 leading-relaxed whitespace-pre-line select-text m-0">
                {selectedFaq.content}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
