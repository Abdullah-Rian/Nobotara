/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { CassiniSaturnHero } from './components/CassiniSaturnHero';
import { Composer, AttachedFile } from './components/Composer';
import { ResponseView } from './components/ResponseView';
import { ConversationHistoryItem } from './types/chat';
import { generateAIResponse } from './services/aiAdvisor';
import { ConstellationBackground } from './components/ConstellationBackground';
import { NasaLiveUpdatesModal } from './components/NasaLiveUpdatesModal';
import { PolicyModal } from './components/PolicyModal';

interface SpaceAIChatProps {
  onBack: () => void;
  activeMissionLabel?: string;
  onPlaySfx?: () => void;
}

const PRESET_PILLS = [
  'Why is NASA targeting the lunar South Pole for Artemis water ice extraction?',
  'Cassini Grand Finale orbital entry',
  'Enceladus subsurface ocean plumes',
];

export default function SpaceAIChat({ onBack, onPlaySfx }: SpaceAIChatProps) {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [activeConversation, setActiveConversation] = useState<ConversationHistoryItem | null>(() => {
    if (typeof window !== 'undefined') {
      const v = new URLSearchParams(window.location.search).get('view');
      if (v === 'response' || v === 'analysis') {
        return {
          id: 'demo-artemis-response',
          question: 'Why is NASA targeting the lunar South Pole for Artemis water ice extraction?',
          time: 'Just now',
          fullAnswer: "NASA's Artemis program targets the Lunar South Pole because it hosts geological conditions found nowhere else on the Moon: deep, permanently shadowed impact craters that act as cosmic cold traps, maintaining constant temperatures as low as 40 K (−233°C) for over two billion years.",
        };
      }
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [promptText, setPromptText] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('text') || new URLSearchParams(window.location.search).get('q');
      if (p) return p;
    }
    return '';
  });
  const [showLiveUpdates, setShowLiveUpdates] = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('live') === 'true';
    }
    return false;
  });
  const [showPolicy, setShowPolicy] = useState(() => {
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('modal') || new URLSearchParams(window.location.search).get('policy');
      return p === 'policy' || p === 'true';
    }
    return false;
  });

  // Support ?ask=... query param to directly open response view
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ask = new URLSearchParams(window.location.search).get('ask');
      if (ask) {
        const query = ask === 'artemis'
          ? 'Why is NASA targeting the lunar South Pole for Artemis water ice extraction?'
          : ask;
        setPromptText(query);
        handleSendMessage(query, []);
      }
    }
  }, []);

  // Check prefers-reduced-motion media query
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) setReducedMotion(true);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleBack = () => {
    onPlaySfx?.();
    if (activeConversation) {
      setActiveConversation(null);
      return;
    }
    onBack();
  };

  const handleSendMessage = async (text: string, attachments: AttachedFile[] = []) => {
    if (!text.trim() && attachments.length === 0) return;
    setIsLoading(true);
    try {
      const response = await generateAIResponse(text, 'Brief', attachments);
      setActiveConversation(response);
    } catch (err) {
      console.error('Failed to generate SpaceAI response:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePillClick = (pillText: string) => {
    const query = pillText.replace(/^Try:\s*/, '');
    setPromptText(query);
    handleSendMessage(query, []);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto overflow-x-hidden select-text bg-black text-[#F8FAFC] flex flex-col justify-between selection:bg-[#38bdf8]/30 selection:text-white">
      {/* Deep Space Background Atmosphere */}
      {/* Pure black deep space canvas */}

      {/* NASA Live Telemetry Hub Modal */}
      <NasaLiveUpdatesModal
        isOpen={showLiveUpdates}
        onClose={() => setShowLiveUpdates(false)}
        onAskSpaceAI={(query) => {
          setPromptText(query);
          handleSendMessage(query, []);
        }}
      />

      {/* Nobotara71 Policy Modal */}
      <PolicyModal
        isOpen={showPolicy}
        onClose={() => setShowPolicy(false)}
        onPlaySfx={onPlaySfx}
      />

      {activeConversation ? (
        <ResponseView
          conversation={activeConversation}
          onBack={() => setActiveConversation(null)}
          onFollowUp={(query) => handleSendMessage(query, [])}
          onOpenLiveUpdates={() => setShowLiveUpdates(true)}
        />
      ) : (
        <>
          {/* 1. Brand Lockup & Top Navbar: Clean Floating Glass Pill Bar */}
          <header className="w-full max-w-4xl mx-auto px-4 sm:px-6 pt-5 pb-3 relative z-30 select-none">
            <div className="w-full bg-[#0a0f1d]/70 backdrop-blur-md border border-white/5 rounded-2xl px-5 sm:px-6 py-3 flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
              {/* Top-Left Brand Lockup: Space (white) + AI (cyan #38bdf8) + Saturn logo icon mirrored */}
              <div className="inline-flex items-center gap-2 select-none">
                <span className="text-[17px] tracking-tight flex items-center">
                  <span className="font-bold text-white">Space</span>
                  <span className="font-bold text-[#38bdf8]">AI</span>
                </span>

                {/* Saturn logo icon AFTER the text, mirrored horizontally (-scale-x-100) */}
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

              {/* Top-Right: Interactive "Live" indicator button with amber dot, and quiet "Home" link */}
              <div className="flex items-center gap-3 select-none">
                <button
                  type="button"
                  onClick={() => setShowLiveUpdates(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-400 text-xs font-mono font-medium transition cursor-pointer shadow-[0_0_10px_rgba(245,158,11,0.2)] active:scale-95"
                  title="View NASA Live Telemetry Updates"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b] animate-pulse" />
                  Live
                </button>
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors cursor-pointer px-1 py-0.5"
                >
                  Home
                </button>
              </div>
            </div>
          </header>

          {/* Main Initial Exploration Deck */}
          <main className="flex-1 flex flex-col items-center justify-center px-4 relative z-20 py-4 sm:py-6">
            <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
              {/* 2. Center Cassini 3D Saturn Hero (Science-accurate WebGL model, locked interaction, 440x165px) */}
              <div className="flex justify-center w-full">
                <CassiniSaturnHero reducedMotion={reducedMotion} />
              </div>

              {/* 3. Spacing & Heading: Exactly ~22px tight gap, clean headline, zero redundant subtext or lines */}
              <h1
                className="mt-[22px] text-center font-semibold text-white tracking-tight text-[28px] sm:text-[32px] select-none"
                style={{ textWrap: 'balance' }}
              >
                What&apos;d you like to explore?
              </h1>

              {/* 4. Google Gemini Lighting Effect Chatbox + 5. Minimal Attachment Menu */}
              <div className="w-full mt-6 sm:mt-7">
                <Composer
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  value={promptText}
                  onChange={setPromptText}
                />
              </div>

              {/* 6. Bottom-Center Exploration Pills */}
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

          {/* 7. Quiet Footer: NOBOTARA71 • SpaceAi • Policy • Gemini 3.8 Flash */}
          <footer className="w-full py-4 text-center select-none relative z-20">
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
        </>
      )}
    </div>
  );
}
