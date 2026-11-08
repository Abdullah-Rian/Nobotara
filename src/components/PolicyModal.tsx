import React, { useState } from 'react';
import { ArrowLeft, X, ArrowRight, ExternalLink } from 'lucide-react';

export interface PolicyTopic {
  id: string;
  title: string;
  dotColor: string;
  shadowColor: string;
  content: string;
  externalLink?: { label: string; url: string };
}

export const POLICY_TOPICS: PolicyTopic[] = [
  {
    id: 'copyright',
    title: 'Copyright',
    dotColor: 'bg-cyan-400',
    shadowColor: '#22d3ee',
    content:
      'All original text, code, design layouts, and custom storytelling elements created by team Nobotara71 are protected. You may share and use our educational content freely for non-commercial, school or personal learning purposes with proper credit.',
  },
  {
    id: 'privacy',
    title: 'User Privacy',
    dotColor: 'bg-emerald-400',
    shadowColor: '#34d399',
    content:
      'We respect your privacy. Our website does not track personal data or require mandatory logins. Any basic interaction data or preferences saved locally in your browser stay entirely with you to ensure a safe, private, and secure learning experience.',
  },
  {
    id: 'terms',
    title: 'Terms of Service',
    dotColor: 'bg-purple-400',
    shadowColor: '#c084fc',
    content:
      'By accessing the Nobotara71 website and browser game, you agree to use the platform solely for educational, non-commercial purposes. Please maintain a respectful environment while interacting with features like our AI assistant and community spaces.',
  },
  {
    id: 'ai-disclosure',
    title: 'AI Disclosure',
    dotColor: 'bg-amber-400',
    shadowColor: '#fbbf24',
    content:
      'Our integrated space helper, "SpaceAi", uses artificial intelligence to answer your space questions and clear up confusion. While we strive for accuracy, AI responses should be used as a fun, supplementary learning guide alongside real science.',
  },
  {
    id: 'nasa-credits',
    title: 'NASA Data Credits',
    dotColor: 'bg-sky-400',
    shadowColor: '#38bdf8',
    content:
      'All images, mission data, audio, videos, and scientific information featured across Nobotara71 are sourced directly from NASA and are in the public domain or properly cited. We extend full credit to NASA for providing the authentic datasets, images, and mission records that make our interactive STEM experience possible.',
    externalLink: { label: 'NASA Open Data (SPD-41a)', url: 'https://science.nasa.gov/researchers/open-science/' },
  },
  {
    id: 'safety',
    title: 'Safety & Content Guidelines',
    dotColor: 'bg-rose-400',
    shadowColor: '#fb7185',
    content:
      'This platform is designed specifically for students, children and young space enthusiasts. All content, text, and AI interactions are strictly moderated to ensure a safe, family-friendly, and positive educational environment for all ages.',
  },
];

interface PolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaySfx?: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({
  isOpen,
  onClose,
  onPlaySfx,
}) => {
  const [selectedTopic, setSelectedTopic] = useState<PolicyTopic | null>(() => {
    if (typeof window !== 'undefined') {
      const t = new URLSearchParams(window.location.search).get('topic');
      if (t) return POLICY_TOPICS.find((p) => p.id === t) || null;
    }
    return null;
  });

  if (!isOpen) return null;

  const handleSelectTopic = (topic: PolicyTopic) => {
    onPlaySfx?.();
    setSelectedTopic(topic);
  };

  const handleBack = () => {
    onPlaySfx?.();
    setSelectedTopic(null);
  };

  const handleClose = () => {
    onPlaySfx?.();
    setSelectedTopic(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex items-center justify-center p-3 sm:p-7 select-text animate-in fade-in duration-200"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Outer Panel matching Team Modal styling (zero white glow) */}
      <div
        className="relative w-full max-w-[560px] p-6 sm:p-8 flex flex-col overflow-hidden rounded-[26px] border border-white/[0.17] select-none text-[#f5f5f5]"
        style={{
          background: 'linear-gradient(145deg, rgba(25,26,29,0.98), rgba(14,15,17,0.99) 62%)',
          boxShadow: '0 32px 100px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.055)',
        }}
        onClick={(e) => e.stopPropagation()}
      >

        {!selectedTopic ? (
          /* ================= VIEW 1: MAIN POLICY MENU (2 BUTTONS PER ROW) ================= */
          <div className="relative z-10">
            {/* Header matching Team Modal */}
            <div className="flex items-center justify-between gap-4 pb-5 mb-5 border-b border-white/[0.095] relative z-10 shrink-0">
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-[-0.03em] leading-snug">
                Open Data &amp; Privacy Policy
              </h2>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close policy window"
                className="w-[36px] h-[36px] rounded-full grid place-items-center border border-white/[0.17] text-[#e8e8ea] bg-white/[0.035] hover:bg-white/[0.11] hover:border-white/[0.35] transition-all cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Intro text */}
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              All planetary imagery, spacecraft ephemeris, and learning interactions adhere to public-domain scientific standards. Select a topic below to review full specifications:
            </p>

            {/* 6 Buttons in 2-Columns Grid (2 Buttons in One Row) */}
            <div className="grid grid-cols-2 gap-2.5">
              {POLICY_TOPICS.map((topic) => (
                <button
                  key={topic.id}
                  type="button"
                  onClick={() => handleSelectTopic(topic)}
                  className="group p-3 sm:py-3.5 sm:px-3.5 rounded-xl bg-white/[0.035] hover:bg-white/[0.07] border border-white/[0.08] hover:border-white/25 transition-all flex items-center justify-between cursor-pointer active:scale-[0.98] text-left"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-1">
                    <span
                      className={`w-2 h-2 rounded-full ${topic.dotColor} shrink-0`}
                      style={{ boxShadow: `0 0 7px ${topic.shadowColor}` }}
                    />
                    <span className="text-[13px] font-semibold text-white group-hover:text-slate-200 transition-colors truncate">
                      {topic.title}
                    </span>
                  </div>

                  <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
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
                aria-label="Close policy window"
                className="w-[36px] h-[36px] rounded-full grid place-items-center border border-white/[0.17] text-[#e8e8ea] bg-white/[0.035] hover:bg-white/[0.11] hover:border-white/[0.35] transition-all cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Topic Title */}
            <div className="flex items-center gap-2.5 mb-3.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${selectedTopic.dotColor} shrink-0`}
                style={{ boxShadow: `0 0 9px ${selectedTopic.shadowColor}` }}
              />
              <h3 className="text-lg font-bold text-white tracking-tight">
                {selectedTopic.title}
              </h3>
            </div>

            {/* Content Box */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
              <p className="text-xs sm:text-[13px] text-slate-200 leading-relaxed whitespace-pre-line select-text">
                {selectedTopic.content}
              </p>

              {selectedTopic.externalLink && (
                <div className="mt-3.5 pt-3 border-t border-white/[0.06]">
                  <a
                    href={selectedTopic.externalLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    <span>{selectedTopic.externalLink.label}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
