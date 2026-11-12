/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { heroVideoSrc, isFastConnection, isSlowConnection, whenIdle } from './utils/network';
import { prefetchGameCode, prefetchMissionFiles } from './play/prefetch';

// The chat (and the 3D and Markdown code it uses) loads only when SpaceAI is opened.
const SpaceAIChat = lazy(() => import('./SpaceAIChat'));
import { PolicyModal } from './components/PolicyModal';
import { TeamModal } from './components/TeamModal';
import { FaqModal } from './components/FaqModal';
import { MISSION_BRIEFS } from './missions/catalog';
import { gameMissionFor } from './play/routes';

type MissionKey = 'apollo11' | 'voyager1' | 'msr';
type ModalView = null | 'purpose' | 'policy' | 'team' | 'faq';
type SfxType = 'switch' | 'cta' | 'menu';

const VALID_MISSIONS: MissionKey[] = ['apollo11', 'voyager1', 'msr'];
const VALID_MODALS: Exclude<ModalView, null>[] = ['purpose', 'policy', 'team', 'faq'];

function parseUrlState(): {
  mission: MissionKey;
  modal: ModalView;
  view: 'home' | 'chat';
} {
  if (typeof window === 'undefined') {
    return { mission: 'apollo11', modal: null, view: 'home' };
  }
  const params = new URLSearchParams(window.location.search);
  const rawParam = params.get('mission');
  const rawMission = (rawParam === 'earth' ? 'msr' : rawParam) as MissionKey | null;
  const rawModal = params.get('modal') as Exclude<ModalView, null> | null;
  const rawView = params.get('view');

  return {
    mission: rawMission && VALID_MISSIONS.includes(rawMission) ? rawMission : 'apollo11',
    modal: rawModal && VALID_MODALS.includes(rawModal) ? rawModal : null,
    view: rawView === 'chat' ? 'chat' : 'home',
  };
}

interface MissionData {
  name: string;
  titleLines: [string, string];
  dockLabel: string;
  video: string;
  still: string;
  cutout: string;
}

const MISSIONS: Record<MissionKey, MissionData> = {
  apollo11: {
    name: 'Apollo 11',
    titleLines: ['ONE GIANT', 'LEAP'],
    dockLabel: 'APOLLO 11',
    video: '/manus-storage/apollo11-moon-3d.mp4',
    still: '/manus-storage/apollo11-moon-still.jpg',
    cutout: '/manus-storage/apollo11-moon-button.png',
  },
  msr: {
    name: 'Mars Sample Return',
    titleLines: ['THE LOST', 'DREAM'],
    dockLabel: 'MSR',
    video: '/manus-storage/msr-mars-3d.mp4',
    still: '/manus-storage/msr-mars-still.jpg',
    cutout: '/manus-storage/msr-button.png',
  },
  voyager1: {
    name: 'Voyager 1',
    titleLines: ['THE GOLDEN', 'RECORD'],
    dockLabel: 'VOYAGER 1',
    video: '/manus-storage/voyager-1-loop-4k_bf38cfe9.mp4',
    still: '/manus-storage/voyager1-space-still.jpg',
    cutout: '/manus-storage/voyager-1-button_0ba1923d.png',
  },
};

const DOCK_ORDER: MissionKey[] = ['apollo11', 'voyager1', 'msr'];

interface TeamMember {
  name: string;
  role: string;
  tag: string;
  avatarUrl?: string;
  isLead?: boolean;
}

const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Samin Yeasar Sarra',
    role: 'Team Lead & Project Director',
    tag: 'Director',
    avatarUrl: '/team/samin_yeasar_sarra.jpg',
    isLead: true,
  },
  {
    name: 'Arijit Talukder',
    role: 'Web Developer & UI Designer',
    tag: 'Web Dev',
    avatarUrl: '/team/arijit_talukder.jpg',
  },
  {
    name: 'Abdullah Al Mustasim',
    role: 'AI & Deployment Engineer',
    tag: 'Web Dev',
    avatarUrl: '/team/abdullah_al_mustasim.jpg',
  },
  {
    name: 'Md Ferdouse Oahid',
    role: 'Game Developer',
    tag: 'Game Dev',
    avatarUrl: '/team/Ferdouse_PP_1254.png',
  },

];

// Pre-renders sound effect PCM samples into a reusable AudioBuffer
async function renderSfxBuffer(ctx: AudioContext, type: SfxType): Promise<AudioBuffer> {
  const sampleRate = ctx.sampleRate || 44100;
  const duration = type === 'cta' ? 0.24 : type === 'switch' ? 0.12 : 0.09;
  const length = Math.max(1, Math.ceil(sampleRate * duration));

  const OfflineCtxClass =
    window.OfflineAudioContext ||
    (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext })
      .webkitOfflineAudioContext;

  if (OfflineCtxClass) {
    try {
      const offlineCtx = new OfflineCtxClass(1, length, sampleRate);
      const now = 0;

      if (type === 'cta') {
        // Dual-oscillator futuristic telemetry chime for mission activation
        const osc1 = offlineCtx.createOscillator();
        const gain1 = offlineCtx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(587.33, now); // D5
        osc1.frequency.exponentialRampToValueAtTime(1174.66, now + 0.16); // D6
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc1.connect(gain1);
        gain1.connect(offlineCtx.destination);
        osc1.start(now);
        osc1.stop(now + 0.22);

        const osc2 = offlineCtx.createOscillator();
        const gain2 = offlineCtx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(880, now + 0.03); // A5
        osc2.frequency.exponentialRampToValueAtTime(1480, now + 0.19);
        gain2.gain.setValueAtTime(0.12, now + 0.03);
        gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        osc2.connect(gain2);
        gain2.connect(offlineCtx.destination);
        osc2.start(now + 0.03);
        osc2.stop(now + 0.22);
      } else if (type === 'switch') {
        // Crisp tactile dock switch frequency sweep
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);
        osc.connect(gain);
        gain.connect(offlineCtx.destination);
        osc.start(now);
        osc.stop(now + 0.11);
      } else {
        // Subdued interface pip for menu / modal toggle
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(620, now + 0.06);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);
        osc.connect(gain);
        gain.connect(offlineCtx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      }

      return await offlineCtx.startRendering();
    } catch {
      // Fall through to Float32Array PCM synthesis fallback
    }
  }

  // Fallback direct PCM synthesis into AudioBuffer
  const buffer = ctx.createBuffer(1, length, sampleRate);
  const channelData = buffer.getChannelData(0);
  let phase1 = 0;
  let phase2 = 0;

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let sample = 0;

    if (type === 'cta') {
      const f1 = 587.33 * Math.pow(1174.66 / 587.33, Math.min(1, t / 0.16));
      phase1 += (2 * Math.PI * f1) / sampleRate;
      const env1 = 0.18 * Math.max(0, 1 - t / 0.22);
      sample += (2 / Math.PI) * Math.asin(Math.sin(phase1)) * env1;

      if (t >= 0.03) {
        const f2 = 880 * Math.pow(1480 / 880, Math.min(1, (t - 0.03) / 0.16));
        phase2 += (2 * Math.PI * f2) / sampleRate;
        const env2 = 0.12 * Math.max(0, 1 - t / 0.22);
        sample += Math.sin(phase2) * env2;
      }
    } else if (type === 'switch') {
      const f = 520 * Math.pow(880 / 520, Math.min(1, t / 0.09));
      phase1 += (2 * Math.PI * f) / sampleRate;
      const env = 0.1 * Math.max(0, 1 - t / 0.11);
      sample = Math.sin(phase1) * env;
    } else {
      const f = 440 * Math.pow(620 / 440, Math.min(1, t / 0.06));
      phase1 += (2 * Math.PI * f) / sampleRate;
      const env = 0.08 * Math.max(0, 1 - t / 0.08);
      sample = Math.sin(phase1) * env;
    }

    channelData[i] = Math.max(-1, Math.min(1, sample));
  }

  return buffer;
}

interface AppProps {
  /** Get Started: open the selected mission in the game (handled in main.tsx). */
  onPlay?: (mission: MissionKey) => void;
}

export default function App({ onPlay }: AppProps = {}) {
  const initialUrl = parseUrlState();
  const [currentMission, setCurrentMission] = useState<MissionKey>(initialUrl.mission);
  const [navOpen, setNavOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<ModalView>(initialUrl.modal);
  const [view, setView] = useState<'home' | 'chat'>(initialUrl.view);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const headerRef = useRef<HTMLDivElement | null>(null);
  const modalSheetRef = useRef<HTMLDivElement | null>(null);
  const modalCloseBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  const isPopStateRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Partial<Record<SfxType, AudioBuffer>>>({});
  const videoRefs = useRef<Record<MissionKey, HTMLVideoElement | null>>({
    apollo11: null,
    voyager1: null,
    msr: null,
  });

  // Helper to lazily instantiate and retrieve the shared AudioContext
  const getAudioContext = (): AudioContext | null => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  };

  // Pre-warms shared AudioBuffers for all sound effect types
  const warmAudioBuffers = async (ctx: AudioContext) => {
    const types: SfxType[] = ['cta', 'switch', 'menu'];
    await Promise.all(
      types.map(async (t) => {
        if (!audioBuffersRef.current[t]) {
          try {
            audioBuffersRef.current[t] = await renderSfxBuffer(ctx, t);
          } catch {
            // Buffer creation fallback handled in renderSfxBuffer
          }
        }
      })
    );
  };

  // Pre-warm AudioContext and cache all sound buffers on first user interaction to eliminate latency
  useEffect(() => {
    const handleFirstGesture = () => {
      const ctx = getAudioContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().catch(() => {});
        }
        warmAudioBuffers(ctx).catch(() => {});
      }
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };

    window.addEventListener('pointerdown', handleFirstGesture, { passive: true });
    window.addEventListener('keydown', handleFirstGesture, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  // Web Audio API Synthesizer using shared pre-rendered AudioBuffers for sample-accurate, zero-latency playback
  const playSfx = (type: SfxType) => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const playFromBuffer = (buf: AudioBuffer) => {
        try {
          const source = ctx.createBufferSource();
          source.buffer = buf;
          source.connect(ctx.destination);
          source.start(0);
        } catch {
          // Ignore playback errors if audio channel disconnected
        }
      };

      const executePlay = async () => {
        let buf = audioBuffersRef.current[type];
        if (!buf) {
          buf = await renderSfxBuffer(ctx, type);
          audioBuffersRef.current[type] = buf;
        }
        playFromBuffer(buf);
      };

      if (ctx.state === 'suspended') {
        ctx.resume().then(executePlay).catch(executePlay);
      } else {
        executePlay();
      }
    } catch {
      // Ignore audio errors if blocked by browser autoplay policy
    }
  };

  // On-demand metadata warming when hovering/focusing a mission tab
  const warmVideo = (planet: MissionKey) => {
    if (isSlowConnection()) return;
    const vid = videoRefs.current[planet];
    if (vid && !vid.getAttribute('src') && vid.dataset.src) {
      vid.setAttribute('preload', 'metadata');
      vid.setAttribute('src', heroVideoSrc(vid.dataset.src));
    }
  };

  // The dock icons are tiny and load at once. The other missions' background stills wait
  // until the page is idle, and are skipped on a slow connection (they load when picked).
  useEffect(() => {
    const load = (url: string) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
    };
    DOCK_ORDER.forEach((key) => load(MISSIONS[key].cutout));
    if (isSlowConnection()) return;
    return whenIdle(() => {
      DOCK_ORDER.forEach((key) => load(MISSIONS[key].still));
    });
  }, []);

  // Background video: only the selected mission's, and only once the page is idle, so the
  // still image, text and buttons come first. On a slow connection or with data saver
  // on, the still image stays and no video is downloaded.
  useEffect(() => {
    const slow = isSlowConnection();
    DOCK_ORDER.forEach((key) => {
      const vid = videoRefs.current[key];
      if (vid && key !== currentMission) {
        vid.classList.remove('is-active');
        vid.pause();
      }
    });
    if (slow) return;
    return whenIdle(() => {
      const vid = videoRefs.current[currentMission];
      if (!vid) return;
      vid.setAttribute('preload', 'auto');
      if (!vid.getAttribute('src') && vid.dataset.src) {
        vid.setAttribute('src', heroVideoSrc(vid.dataset.src));
        vid.load();
      }
      vid.classList.add('is-active');
      vid.play()?.catch(() => {});
    });
  }, [currentMission]);

  // Warm the game up. Its code comes once the page is idle (not on a slow connection).
  // On a measured fast connection, the selected mission's first models follow once the
  // choice has settled for a few seconds.
  useEffect(() => {
    if (isSlowConnection()) return;
    return whenIdle(prefetchGameCode, 4000);
  }, []);

  useEffect(() => {
    if (!isFastConnection()) return;
    let cancelIdle = () => {};
    const timer = window.setTimeout(() => {
      cancelIdle = whenIdle(() => prefetchMissionFiles(gameMissionFor(currentMission)));
    }, 3000);
    return () => {
      window.clearTimeout(timer);
      cancelIdle();
    };
  }, [currentMission]);

  // Synchronize URL query parameters & browser history (Back/Forward support)
  useEffect(() => {
    const onPopState = () => {
      isPopStateRef.current = true;
      const next = parseUrlState();
      setCurrentMission(next.mission);
      setActiveModal(next.modal);
      setView(next.view);
      setNavOpen(false);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (isPopStateRef.current) {
      isPopStateRef.current = false;
      return;
    }
    const params = new URLSearchParams();
    if (currentMission !== 'apollo11') {
      params.set('mission', currentMission);
    }
    if (activeModal) {
      params.set('modal', activeModal);
    }
    if (view === 'chat') {
      params.set('view', 'chat');
    }
    const search = params.toString();
    const nextUrl = `${window.location.pathname}${search ? `?${search}` : ''}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl !== currentUrl) {
      window.history.pushState({ mission: currentMission, modal: activeModal, view }, '', nextUrl);
    }
  }, [currentMission, activeModal, view]);

  // Close menu/modals on Escape key & trap keyboard focus inside active modal
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeModal) {
          playSfx('menu');
          setActiveModal(null);
        } else if (navOpen) {
          playSfx('menu');
          setNavOpen(false);
        }
        return;
      }

      if (e.key === 'Tab' && activeModal && modalSheetRef.current) {
        const focusable = modalSheetRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [activeModal, navOpen]);

  // Manage focus entry & restoration when modal opens or closes
  useEffect(() => {
    if (activeModal) {
      lastFocusedRef.current = document.activeElement as HTMLElement | null;
      const timer = window.setTimeout(() => {
        modalCloseBtnRef.current?.focus();
      }, 40);
      return () => clearTimeout(timer);
    } else if (lastFocusedRef.current) {
      lastFocusedRef.current.focus();
      lastFocusedRef.current = null;
    }
  }, [activeModal]);

  const handleSelectMission = (key: MissionKey) => {
    if (key === currentMission) return;
    playSfx('switch');
    setCurrentMission(key);
    setNavOpen(false);
  };

  /** Start Mission: open the selected mission in the game. */
  const handleGetStarted = () => {
    setNavOpen(false);
    playSfx('cta');
    onPlay?.(currentMission);
  };

  const handleOpenSpaceAi = () => {
    playSfx('cta');
    setNavOpen(false);
    setView('chat');
  };

  const mission = MISSIONS[currentMission];
  const brief = MISSION_BRIEFS[gameMissionFor(currentMission)];

  return (
    <>
    <div className="app-shell">
      <div className="device-viewport">
        {/* 1. Full-Bleed Background Video Engine */}
        <div
          className="sky-stage"
          style={{ backgroundImage: `url(${mission.still})` }}
        >
          <video
            ref={(el) => {
              videoRefs.current.apollo11 = el;
            }}
            data-planet="apollo11"
            muted
            loop
            playsInline
            preload="none"
            data-src={MISSIONS.apollo11.video}
            aria-hidden="true"
          />
          <video
            ref={(el) => {
              videoRefs.current.voyager1 = el;
            }}
            data-planet="voyager1"
            muted
            loop
            playsInline
            preload="none"
            data-src={MISSIONS.voyager1.video}
            aria-hidden="true"
          />
          <video
            ref={(el) => {
              videoRefs.current.msr = el;
            }}
            data-planet="msr"
            muted
            loop
            playsInline
            preload="none"
            data-src={MISSIONS.msr.video}
            aria-hidden="true"
          />
        </div>

        {/* Ambient Starfield & Scrim */}
        <div className="starfield" aria-hidden="true" />
        <div className="sky-scrim" aria-hidden="true" />

        {/* 2. Unified Master HUD Layer */}
        <div className="hud-layer">
          {/* Top Header */}
          <header ref={headerRef} className="top-header">
            <a
              href="#top"
              className="brandmark"
              onClick={(e) => {
                e.preventDefault();
                playSfx('menu');
                setActiveModal(null);
                setNavOpen(false);
              }}
            >
              {/* Orbital Planet Ring SVG matching screenshot */}
              <svg
                className="brandmark-icon"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle
                  cx="20"
                  cy="20"
                  r="10"
                  stroke="#FFFFFF"
                  strokeWidth="2.4"
                />
                <ellipse
                  cx="20"
                  cy="20"
                  rx="17.5"
                  ry="5.8"
                  transform="rotate(-26 20 20)"
                  stroke="#FFFFFF"
                  strokeWidth="2.3"
                />
              </svg>
              <span className="brandmark-text">
                Nobotara<span>71</span>
              </span>
            </a>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                className="header-spaceai-btn"
                onClick={handleOpenSpaceAi}
                aria-label="Launch SpaceAI Assistant"
              >
                <span className="text-[16px] font-semibold tracking-tight text-[#F8FAFC] whitespace-nowrap">
                  Space<span className="text-[#60A5FA] font-medium">AI</span>
                </span>
              </button>

              <button
                type="button"
                className="hamburger-btn"
                data-open={navOpen ? 'true' : 'false'}
                aria-label={navOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={navOpen}
                onClick={() => {
                  playSfx('menu');
                  setNavOpen((prev) => !prev);
                }}
              >
                <span />
                <span />
                <span />
              </button>
            </div>
          </header>

          {/* Slide-Out / Popover Hamburger Menu with Entry & Exit Transitions */}
          <AnimatePresence>
            {navOpen && (
              <motion.nav
                className="nav-dropdown"
                aria-label="Site navigation"
                initial={{ opacity: 0, y: -10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.97 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              >
                <button
                  type="button"
                  className={`nav-item-btn ${activeModal === null ? 'is-current' : ''}`}
                  onClick={() => {
                    playSfx('menu');
                    setActiveModal(null);
                    setNavOpen(false);
                  }}
                >
                  <span>Missions</span>
                </button>
                <button
                  type="button"
                  className={`nav-item-btn ${activeModal === 'faq' || activeModal === 'purpose' ? 'is-current' : ''}`}
                  onClick={() => {
                    playSfx('menu');
                    setActiveModal('faq');
                    setNavOpen(false);
                  }}
                >
                  <span>FAQ</span>
                </button>
                <button
                  type="button"
                  className={`nav-item-btn ${activeModal === 'policy' ? 'is-current' : ''}`}
                  onClick={() => {
                    playSfx('menu');
                    setActiveModal('policy');
                    setNavOpen(false);
                  }}
                >
                  <span>Policy</span>
                </button>
                <button
                  type="button"
                  className={`nav-item-btn ${activeModal === 'team' ? 'is-current' : ''}`}
                  onClick={() => {
                    playSfx('menu');
                    setActiveModal('team');
                    setNavOpen(false);
                  }}
                >
                  <span>Team</span>
                </button>
                <button
                  type="button"
                  className="nav-item-btn"
                  aria-label={soundEnabled ? 'Mute telemetry audio' : 'Unmute telemetry audio'}
                  onClick={() => {
                    setSoundEnabled((prev) => !prev);
                  }}
                >
                  <span>Telemetry Audio SFX</span>
                  <span className="inline-flex items-center justify-center">
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.75)] transition-colors" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-[#FF3B5C] drop-shadow-[0_0_8px_rgba(255,59,92,0.75)] transition-colors" />
                    )}
                  </span>
                </button>
              </motion.nav>
            )}
          </AnimatePresence>

          {/* Hero: mission name and its brief, with Start Mission. The dock below swaps it. */}
          <div className="hero-header-block">
            <div className="mission-eyebrow">{brief.number} · {brief.name}</div>
            <h1 className="mission-title">
              {mission.titleLines.join(' ')}
            </h1>
            <motion.section
              layout
              className="description-card brief-card"
              aria-live="polite"
              aria-label={`${brief.name} mission brief`}
              transition={{
                layout: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={currentMission}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="brief-date">{brief.date}</div>
                  <p className="brief-intro">{brief.intro}</p>
                  <p className="brief-summary">{brief.summary}</p>
                  <ol className="brief-steps">
                    {brief.steps.map((step, i) => (
                      <li key={step}>
                        <span className="brief-step-num" aria-hidden="true">{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </motion.div>
              </AnimatePresence>
              <button
                type="button"
                id="start-mission-btn"
                className="cta-glow-btn brief-start"
                onClick={handleGetStarted}
                onPointerEnter={prefetchGameCode}
                onFocus={prefetchGameCode}
              >
                START MISSION
              </button>
            </motion.section>
          </div>

          {/* Lower Stack: mission dock */}
          <div className="lower-stack">
            {/* Bottom Segmented Capsule Dock */}
            <div className="bottom-dock" role="tablist" aria-label="Select Mission">
              {DOCK_ORDER.map((key) => {
                const item = MISSIONS[key];
                const isActive = key === currentMission;
                return (
                  <button
                    key={key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`dock-tab ${isActive ? 'is-active' : ''}`}
                    onPointerEnter={() => warmVideo(key)}
                    onFocus={() => warmVideo(key)}
                    onClick={() => handleSelectMission(key)}
                  >
                    {isActive && (
                      <span className="dock-thumb" aria-hidden="true">
                        <img
                          src={item.cutout}
                          alt=""
                          loading="eager"
                          decoding="sync"
                          fetchPriority="high"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </span>
                    )}
                    <span>{item.dockLabel}</span>
                  </button>
                );
              })}
              {/* Keep all 3 dock thumbnail bitmaps mounted in GPU memory for instant 0ms tab switches */}
              <div className="sr-only" aria-hidden="true">
                {DOCK_ORDER.map((key) => (
                  <img
                    key={key}
                    src={MISSIONS[key].cutout}
                    alt=""
                    loading="eager"
                    decoding="sync"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Interactive Mission Dossier & Navigation Modals with Focus Trap & Exit Animation */}
        <PolicyModal
          isOpen={activeModal === 'policy'}
          onClose={() => setActiveModal(null)}
          onPlaySfx={() => playSfx('menu')}
        />

        <TeamModal
          isOpen={activeModal === 'team'}
          onClose={() => setActiveModal(null)}
          onPlaySfx={() => playSfx('menu')}
        />

        <FaqModal
          isOpen={activeModal === 'faq' || activeModal === 'purpose'}
          onClose={() => setActiveModal(null)}
          onPlaySfx={() => playSfx('menu')}
        />

      </div>
    </div>

    {/* 4. Cohesive Animated SpaceAI Telemetry Subsystem */}
    <AnimatePresence>
      {view === 'chat' && (
        <motion.div
          key="spaceai-subsystem"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="fixed inset-0 z-[100]"
        >
          <Suspense fallback={<div className="fixed inset-0 bg-[#03070e]" />}>
            <SpaceAIChat
              onBack={() => setView('home')}
              activeMissionLabel={mission.dockLabel}
              onPlaySfx={() => playSfx('menu')}
            />
          </Suspense>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
