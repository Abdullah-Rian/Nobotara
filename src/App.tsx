/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import SpaceAIChat from './SpaceAIChat';
import { PolicyModal } from './components/PolicyModal';
import { TeamModal } from './components/TeamModal';
import { FaqModal } from './components/FaqModal';

type MissionKey = 'apollo11' | 'voyager1' | 'msr';
type ModalView = null | 'dossier' | 'purpose' | 'policy' | 'team' | 'faq';
type SfxType = 'switch' | 'cta' | 'menu';

const VALID_MISSIONS: MissionKey[] = ['apollo11', 'voyager1', 'msr'];
const VALID_MODALS: Exclude<ModalView, null>[] = ['dossier', 'purpose', 'policy', 'team', 'faq'];

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

interface MissionTelemetry {
  label: string;
  value: string;
  unit?: string;
}

interface MissionData {
  name: string;
  eyebrow: string;
  titleLines: [string, string];
  description: string;
  dockLabel: string;
  video: string;
  still: string;
  cutout: string;
  telemetry: MissionTelemetry[];
  highlights: string[];
}

const MISSIONS: Record<MissionKey, MissionData> = {
  apollo11: {
    name: 'Apollo 11',
    eyebrow: 'MISSION: APOLLO 11',
    titleLines: ['ONE GIANT', 'LEAP'],
    description:
      "Humanity's first lunar landing on July 20, 1969. Explore the historic Sea of Tranquility landing site and Eagle lunar module.",
    dockLabel: 'APOLLO 11',
    video: '/manus-storage/apollo11-moon-3d.mp4',
    still: '/manus-storage/apollo11-moon-still.jpg',
    cutout: '/manus-storage/apollo11-moon-button.png',
    telemetry: [
      { label: 'Lunar Landing', value: '20:17:40', unit: 'UTC' },
      { label: 'Surface Stay', value: '21.6', unit: 'HOURS' },
      { label: 'Lunar Coordinates', value: '0.674° N', unit: '23.473° E' },
      { label: 'Samples Recovered', value: '21.55', unit: 'KG' },
    ],
    highlights: [
      'Touchdown at Mare Tranquillitatis (Sea of Tranquility) with 25 seconds of fuel remaining.',
      'First human footsteps imprinted on the lunar regolith by Neil Armstrong and Buzz Aldrin.',
      'Successful lunar module ascent stage rendezvous with Command Module Columbia in lunar orbit.',
    ],
  },
  msr: {
    name: 'Mars Sample Return',
    eyebrow: 'MISSION: MARS SAMPLE RETURN',
    titleLines: ['THE LOST', 'DREAM'],
    description:
      "Humanity's first interplanetary sample return, retrieving Martian rock cores from Jezero Crater and following them to Earth.",
    dockLabel: 'MSR',
    video: '/manus-storage/msr-mars-3d.mp4',
    still: '/manus-storage/msr-mars-still.jpg',
    cutout: '/manus-storage/msr-button.png',
    telemetry: [
      { label: 'Target Site', value: 'JEZERO', unit: 'CRATER' },
      { label: 'Coordinates', value: '18.38° N', unit: '77.58° E' },
      { label: 'Sample Tubes', value: '43', unit: 'TITANIUM' },
      { label: 'Transit Distance', value: '1.524', unit: 'AU' },
    ],
    highlights: [
      'Perseverance rover cached hermetically sealed titanium tubes of ancient Martian river delta rock and regolith at Three Forks.',
      'Designed around a Mars Ascent Vehicle (MAV) to perform the first rocket launch from the surface of another planet.',
      'Earth Return Orbiter rendezvous in Martian orbit to capture and return pristine samples for astrobiological analysis.',
    ],
  },
  voyager1: {
    name: 'Voyager 1',
    eyebrow: 'MISSION: VOYAGER 1',
    titleLines: ['THE GOLDEN', 'DISK'],
    description:
      "Humanity's farthest emissary in interstellar space, carrying the Golden Record past the heliopause into the cosmic deep.",
    dockLabel: 'VOYAGER 1',
    video: '/manus-storage/voyager-1-loop-4k_bf38cfe9.mp4',
    still: '/manus-storage/voyager1-space-still.jpg',
    cutout: '/manus-storage/voyager-1-button_0ba1923d.png',
    telemetry: [
      { label: 'Heliocentric Distance', value: '165.2', unit: 'AU' },
      { label: 'Escape Velocity', value: '17.0', unit: 'KM/S' },
      { label: 'Signal One-Way Time', value: '22.9', unit: 'HOURS' },
      { label: 'Golden Record', value: '115', unit: 'IMAGES' },
    ],
    highlights: [
      'Crossed the heliopause into interstellar space on August 25, 2012 — 121 AU from the Sun.',
      'Carries the 12-inch gold-plated copper phonograph record encoded with Earth sounds, greetings, and diagrams.',
      'Continuous telemetry returned via the Deep Space Network across a distance exceeding 24 billion kilometers.',
    ],
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

export default function App() {
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
    const vid = videoRefs.current[planet];
    if (vid && !vid.getAttribute('src') && vid.dataset.src) {
      vid.setAttribute('preload', 'metadata');
      vid.setAttribute('src', vid.dataset.src);
    }
  };

  // Eagerly preload and decode all mission dock icons and background stills on mount
  useEffect(() => {
    DOCK_ORDER.forEach((key) => {
      const { cutout, still } = MISSIONS[key];
      [cutout, still].forEach((url) => {
        const img = new Image();
        img.decoding = 'sync';
        img.src = url;
        img.decode?.().catch(() => {});
      });
    });
  }, []);

  // Sync active background video playback without eager multi-stream preloading
  useEffect(() => {
    DOCK_ORDER.forEach((key) => {
      const vid = videoRefs.current[key];
      if (!vid) return;
      if (key === currentMission) {
        vid.setAttribute('preload', 'auto');
        if (!vid.getAttribute('src') && vid.dataset.src) {
          vid.setAttribute('src', vid.dataset.src);
          vid.load();
        }
        vid.classList.add('is-active');
        const p = vid.play();
        if (p !== undefined) {
          p.catch(() => {});
        }
      } else {
        vid.classList.remove('is-active');
        vid.pause();
      }
    });
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

const handleGetStarted = () => {
  setNavOpen(false);
  playSfx('cta');
  window.location.href = 'https://nobotara-71.netlify.app/';
};

  const handleOpenSpaceAi = () => {
    playSfx('cta');
    setNavOpen(false);
    setView('chat');
  };

  const mission = MISSIONS[currentMission];

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
            className={currentMission === 'apollo11' ? 'is-active' : ''}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
            src={MISSIONS.apollo11.video}
            poster={MISSIONS.apollo11.still}
            aria-hidden="true"
          />
          <video
            ref={(el) => {
              videoRefs.current.voyager1 = el;
            }}
            data-planet="voyager1"
            className={currentMission === 'voyager1' ? 'is-active' : ''}
            muted
            loop
            playsInline
            preload="none"
            data-src={MISSIONS.voyager1.video}
            poster={MISSIONS.voyager1.still}
            aria-hidden="true"
          />
          <video
            ref={(el) => {
              videoRefs.current.msr = el;
            }}
            data-planet="msr"
            className={currentMission === 'msr' ? 'is-active' : ''}
            muted
            loop
            playsInline
            preload="none"
            data-src={MISSIONS.msr.video}
            poster={MISSIONS.msr.still}
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

          {/* Hero Typography & Frosted Description Card */}
          <div className="hero-header-block">
            <div className="mission-eyebrow">{mission.eyebrow}</div>
            <h1 className="mission-title">
              {mission.titleLines.join(' ')}
            </h1>
            <motion.div
              layout
              className="description-card"
              transition={{
                layout: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
              }}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={currentMission}
                  initial={{ opacity: 0, y: 7 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -7 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                >
                  {mission.description}
                </motion.p>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Lower Stack: Glowing CTA + Bottom Segmented Dock */}
          <div className="lower-stack">
            <button
              type="button"
              id="get-started-btn"
              className="cta-glow-btn"
              onClick={handleGetStarted}
              aria-haspopup="dialog"
              aria-expanded={activeModal === 'dossier'}
              aria-controls="mission-dossier-modal"
            >
              GET STARTED
            </button>

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

        <AnimatePresence>
          {activeModal && activeModal !== 'policy' && activeModal !== 'team' && activeModal !== 'faq' && activeModal !== 'purpose' && (
            <motion.div
              className="modal-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={() => {
                playSfx('menu');
                setActiveModal(null);
              }}
            >
              <motion.div
                key={activeModal}
                ref={modalSheetRef}
                id="mission-dossier-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-sheet-title"
                className="modal-sheet"
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.16, ease: 'easeIn' } }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
                  <div>
                    <div className="text-[11px] font-bold tracking-widest uppercase text-[#00E5FF]">
                      {mission.eyebrow}
                    </div>
                    <h2
                      id="modal-sheet-title"
                      className="text-xl font-extrabold tracking-tight text-white mt-0.5"
                    >
                      {`${mission.titleLines[0]} ${mission.titleLines[1]}`}
                    </h2>
                  </div>
                  <button
                    ref={modalCloseBtnRef}
                    type="button"
                    onClick={() => {
                      playSfx('menu');
                      setActiveModal(null);
                    }}
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-[#00E5FF] text-white flex items-center justify-center text-sm font-bold cursor-pointer transition-colors"
                    aria-label="Close modal"
                  >
                    ✕
                  </button>
                </div>

                {activeModal === 'dossier' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2.5">
                      {mission.telemetry.map((t) => (
                        <div
                          key={t.label}
                          className="p-3 rounded-xl bg-white/5 border border-white/10"
                        >
                          <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                            {t.label}
                          </div>
                          <div className="text-base font-extrabold font-mono text-white mt-1">
                            {t.value}
                            {t.unit && (
                              <span className="text-[11px] font-mono text-[#00E5FF] ml-1">
                                {t.unit}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        Mission Log & Milestones
                      </div>
                      {mission.highlights.map((h, i) => (
                        <p
                          key={i}
                          className="text-xs leading-relaxed text-slate-300 bg-white/5 rounded-xl p-3 border border-white/5"
                        >
                          {h}
                        </p>
                      ))}
                    </div>

                    <div className="pt-2 flex items-center gap-2">
                      {DOCK_ORDER.map((k) => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => handleSelectMission(k)}
                          className={`flex-1 py-2.5 px-3 rounded-full text-xs font-extrabold uppercase cursor-pointer transition-colors ${
                            k === currentMission
                              ? 'bg-[#00E5FF] text-[#030914]'
                              : 'bg-white/10 text-slate-300 hover:bg-white/15'
                          }`}
                        >
                          {MISSIONS[k].dockLabel}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
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
          <SpaceAIChat
            onBack={() => setView('home')}
            activeMissionLabel={mission.dockLabel}
            onPlaySfx={() => playSfx('menu')}
          />
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
