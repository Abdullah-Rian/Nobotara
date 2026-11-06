import React, { useState, useEffect } from 'react';
import { X, SlidersHorizontal, User, Sparkles, Check, RotateCcw } from 'lucide-react';

export interface PersonalizationConfig {
  enabled: boolean;
  userName: string;
  userRole: string;
  tone: 'Concise' | 'Balanced' | 'In-depth' | 'Analytical';
  customDirectives: string;
}

export const defaultPersonalization: PersonalizationConfig = {
  enabled: true,
  userName: 'Jason Vance',
  userRole: 'Astrophysics & Space Systems',
  tone: 'Balanced',
  customDirectives: 'Explain celestial mechanics, NASA mission history, and cosmic phenomena with scientific precision, physical telemetry, and wonder.',
};

interface PersonalizeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  config: PersonalizationConfig;
  onSave: (config: PersonalizationConfig) => void;
}

export const PersonalizeDrawer: React.FC<PersonalizeDrawerProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [draft, setDraft] = useState<PersonalizationConfig>(config);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(draft);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
  };

  const handleReset = () => {
    setDraft(defaultPersonalization);
  };

  const tones: PersonalizationConfig['tone'][] = [
    'Concise',
    'Balanced',
    'In-depth',
    'Analytical',
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
      />

      {/* Slide-over panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#0B1120]/95 backdrop-blur-2xl border-l border-white/[0.08] shadow-2xl flex flex-col justify-between p-6">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[#38BDF8]/10 border border-[#38BDF8]/20 flex items-center justify-center text-[#38BDF8]">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[16px] font-semibold text-[#F8FAFC]">Personalize Chat</h2>
                  <p className="text-[12px] text-[#94A3B8]">Tailor AI tone, instructions & context</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-white/[0.06] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Toggle Status */}
            <div className="mt-5 p-3.5 rounded-xl bg-white/[0.035] border border-white/[0.08] flex items-center justify-between">
              <div>
                <span className="text-[13px] font-medium text-[#F8FAFC] block">Active Personalization</span>
                <span className="text-[11.5px] text-[#94A3B8] block">Apply custom instructions to all queries</span>
              </div>
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, enabled: !d.enabled }))}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  draft.enabled ? 'bg-[#2563EB]' : 'bg-white/[0.15]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    draft.enabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* User Profile Info */}
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">User Name</label>
                <input
                  type="text"
                  value={draft.userName}
                  onChange={(e) => setDraft((d) => ({ ...d, userName: e.target.value }))}
                  placeholder="e.g. Jason Vance"
                  className="w-full bg-white/[0.035] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8]/50 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">Domain & Role</label>
                <input
                  type="text"
                  value={draft.userRole}
                  onChange={(e) => setDraft((d) => ({ ...d, userRole: e.target.value }))}
                  placeholder="e.g. Astrophysics & Space Systems"
                  className="w-full bg-white/[0.035] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8]/50 transition-colors"
                />
              </div>

              {/* Tone Selection */}
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">Assistant Tone</label>
                <div className="grid grid-cols-2 gap-2">
                  {tones.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, tone: t }))}
                      className={`p-2.5 rounded-lg text-[13px] font-medium text-left border transition-all cursor-pointer ${
                        draft.tone === t
                          ? 'bg-[#38BDF8]/10 text-[#38BDF8] border-[#38BDF8]/40'
                          : 'bg-white/[0.035] text-[#CBD5E1] border-white/[0.08] hover:border-white/[0.15]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{t}</span>
                        {draft.tone === t && <Check className="w-3.5 h-3.5 text-[#38BDF8]" />}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Directives */}
              <div>
                <label className="block text-xs font-medium text-[#CBD5E1] mb-1.5">Custom Directives</label>
                <textarea
                  rows={4}
                  value={draft.customDirectives}
                  onChange={(e) => setDraft((d) => ({ ...d, customDirectives: e.target.value }))}
                  placeholder="e.g. Focus on NASA mission flight telemetry, planetary geology, orbital dynamics, and astronomical scale (AU, light-years)..."
                  className="w-full bg-white/[0.035] border border-white/[0.08] rounded-lg p-2.5 text-[13px] text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#38BDF8]/50 resize-none font-sans leading-relaxed transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-white/[0.08] flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 text-[13px] font-medium text-[#94A3B8] hover:text-[#F8FAFC] flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-[13px] font-medium text-[#94A3B8] hover:text-[#F8FAFC] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-4 py-2 text-[13px] font-medium text-white bg-[#2563EB] hover:bg-[#1D4ED8] rounded-lg shadow-[0_0_16px_rgba(37,99,235,0.35)] transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {savedSuccess ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved</span>
                  </>
                ) : (
                  <span>Save Settings</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
