import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Rocket,
  Volume2,
  VolumeX,
  X,
  ExternalLink,
  Calendar,
  Clock,
  Sparkles,
  Send,
  ArrowUpRight,
} from 'lucide-react';

export type MissionCategory = 'all' | 'crewed' | 'astronomy' | 'deepspace' | 'mars';

export interface TelemetryCell {
  label: string;
  value: string;
}

export interface MissionCopilotData {
  title: string;
  synthesis: string;
  chips: string[];
  chipAnswers: Record<string, string>;
}

export interface MissionEvent {
  id: string;
  missionKey: string;
  title: string;
  category: Exclude<MissionCategory, 'all'>;
  badgeLabel: string;
  statusLabel: string;
  accentColor: 'amber' | 'emerald' | 'cyan' | 'orange' | 'sky';
  thumbnailUrl: string;
  fallbackThumbnailUrl: string;
  description: string;
  telemetry: [TelemetryCell, TelemetryCell, TelemetryCell, TelemetryCell];
  footerTimeLabel: string;
  footerTimeIcon: 'calendar' | 'clock';
  articleLabel: string;
  nasaArticleUrl: string;
  queryPrompt: string;
  copilot: MissionCopilotData;
}

export const UPCOMING_MISSION_ALERTS: MissionEvent[] = [
  {
    id: 'artemis-2',
    missionKey: 'Artemis II',
    title: 'Artemis II Crewed Lunar Orbit Flyby',
    category: 'crewed',
    badgeLabel: 'Crewed Lunar Mission',
    statusLabel: 'T-Minus Integration',
    accentColor: 'amber',
    thumbnailUrl: 'https://images-assets.nasa.gov/image/art002e000001/art002e000001~thumb.jpg',
    fallbackThumbnailUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260827_202133_508c64b8-a31e-4290-bdfc-1187df70e0a6.png',
    description:
      "The first crewed flight of NASA's Orion spacecraft atop the Space Launch System (SLS). Four astronauts will embark on a 10-day translunar trajectory test around the Moon, proving human deep-space environmental systems.",
    telemetry: [
      { label: 'Trajectory', value: 'Free-Return' },
      { label: 'Perilune', value: '7,400 km Far Side' },
      { label: 'Flight Crew', value: '4 Astronauts' },
      { label: 'Launch Site', value: 'Kennedy LC-39B' },
    ],
    footerTimeLabel: 'Target Window: Late 2025 / Early 2026',
    footerTimeIcon: 'calendar',
    articleLabel: 'NASA Article',
    nasaArticleUrl: 'https://www.nasa.gov/mission/artemis-ii/',
    queryPrompt:
      'Explain the Artemis II mission timeline, crew members, and lunar free-return trajectory.',
    copilot: {
      title: 'Artemis II Crewed Lunar Orbit Flyby',
      synthesis:
        'SpaceAI Telemetry: Artemis II will launch four astronauts (Reid Wiseman, Victor Glover, Christina Koch, and Jeremy Hansen) atop the 5.5-million-pound SLS Block 1 rocket on a 10-day translunar trajectory test. Orion will loop 7,400 km behind the lunar far side on a hybrid free-return trajectory before re-entering Earth atmosphere at Mach 32 (40,000 km/h).',
      chips: [
        'What are the primary life-support validation metrics?',
        'How does the free-return trajectory ensure crew safety?',
        'How will astronauts communicate from the lunar far side?',
      ],
      chipAnswers: {
        'What are the primary life-support validation metrics?':
          'Orion ECLSS validation tests CO₂amine swing-bed scrubbers, O₂/N₂ pressure regulation at 10.2 psi during high metabolic exercise cycles, and radiation shielding telemetry across the Van Allen belts.',
        'How does the free-return trajectory ensure crew safety?':
          'After the translunar injection (TLI) burn, lunar gravity naturally slingshots Orion back toward Earth’s entry corridor without requiring a major lunar orbit insertion burn—guaranteeing safe return even if main propulsion fails.',
        'How will astronauts communicate from the lunar far side?':
          'Orion uses NASA’s Deep Space Network (DSN) S-band and optical laser communications (O2O) at 260 Mbps, experiencing a ~42-minute RF occultation blackout while passing directly behind the lunar disk.',
      },
    },
  },
  {
    id: 'mars-jupiter-alignment',
    missionKey: 'Mars-Jupiter',
    title: 'Mars & Jupiter Great Planetary Conjunction',
    category: 'astronomy',
    badgeLabel: 'Celestial Ephemeris',
    statusLabel: 'Naked Eye Visible',
    accentColor: 'emerald',
    thumbnailUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260827_202133_0ba6de7c-285d-43dc-b7ab-8c54c73707cb.png',
    fallbackThumbnailUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260827_202133_0ba6de7c-285d-43dc-b7ab-8c54c73707cb.png',
    description:
      "Mars and Jupiter converge to an angular separation under 0.3° in the constellation Taurus. Visible to the naked eye before dawn, with Jupiter's Galilean moons clearly resolvable through standard field binoculars.",
    telemetry: [
      { label: 'Separation', value: '< 0.3° (18 arcmin)' },
      { label: 'Constellation', value: 'Taurus (East)' },
      { label: 'Target Moons', value: 'Io, Europa, Ganymede' },
      { label: 'Ephemeris', value: 'JPL Horizons Sync' },
    ],
    footerTimeLabel: 'Next Major Conjunction Window',
    footerTimeIcon: 'clock',
    articleLabel: 'NASA Article',
    nasaArticleUrl: 'https://science.nasa.gov/skywatching/',
    queryPrompt:
      'When is the next Mars-Jupiter conjunction, how close will they appear, and how can I view it with binoculars?',
    copilot: {
      title: 'Mars & Jupiter Great Planetary Conjunction',
      synthesis:
        'SpaceAI Ephemeris: Mars (mag +0.8) and Jupiter (mag -2.2) converge to within 0.28° (less than the width of a full Moon) in the pre-dawn eastern sky. In 10x50 binoculars, bright Jupiter is flanked by Ganymede, Io, Europa, and Callisto with the rusty ochre disk of Mars adjacent in the same field of view.',
      chips: [
        'What is the optical separation in arcminutes?',
        'What is the best observation time before dawn?',
        'How often does this conjunction repeat in Taurus?',
      ],
      chipAnswers: {
        'What is the optical separation in arcminutes?':
          'Minimum geocentric appulse reaches 16.8 arcminutes (0.28°)—roughly half the apparent angular diameter of the Moon (31 arcminutes).',
        'What is the best observation time before dawn?':
          'Optimal viewing is 90 to 45 minutes before local sunrise looking East-Northeast at an altitude of 28°–35° above the horizon in Taurus, near Aldebaran.',
        'How often does this conjunction repeat in Taurus?':
          'While Mars-Jupiter conjunctions occur roughly every 2.23 years (26.8 months), sub-0.3° close appulses inside the Taurus ecliptic gate occur only once every 15–17 years.',
      },
    },
  },
  {
    id: 'europa-clipper-flyby',
    missionKey: 'Europa',
    title: "How Europa Clipper Scans Europa's Ice Shell",
    category: 'deepspace',
    badgeLabel: 'Jupiter Icy Moons',
    statusLabel: 'REASON Radar Sounding',
    accentColor: 'cyan',
    thumbnailUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260827_202133_cf55d1d8-7b59-4a64-80da-d72052ae974e.png',
    fallbackThumbnailUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260827_202133_cf55d1d8-7b59-4a64-80da-d72052ae974e.png',
    description:
      'How does Europa Clipper scan through the icy crust of Europa? The REASON radar utilizes dual 9 MHz and 60 MHz high-frequency pulses to penetrate 30 km into the frozen crust, sounding for the global subsurface water ocean.',
    telemetry: [
      { label: 'Sounding Depth', value: 'Up to 30 km Ice' },
      { label: 'Dual Radar', value: '9 MHz & 60 MHz' },
      { label: 'Arrival', value: 'April 2030 (Jovian)' },
      { label: 'Cruising Dist', value: '2.9 AU from Sun' },
    ],
    footerTimeLabel: '28 hours ago • REASON Radar Team',
    footerTimeIcon: 'clock',
    articleLabel: 'JPL Mission Data',
    nasaArticleUrl: 'https://www.jpl.nasa.gov/missions/europa-clipper',
    queryPrompt: 'How does Europa Clipper scan through the icy crust of Europa?',
    copilot: {
      title: 'Europa Clipper / REASON Radar Sounding',
      synthesis:
        'SpaceAI Radar Science: REASON (Radar for Europa Assessment and Sounding: Ocean to Near-surface) emits 9 MHz HF and 60 MHz VHF radio beams from twin 17.6-meter solar array dipoles. Cold ice is nearly transparent to radio waves, whereas liquid briny water reflects strongly—allowing Clipper to chart ice shell thickness and perched water lenses.',
      chips: [
        'How does REASON map ice thickness between 15-25 km?',
        'What are the radiation hardening precautions at Jupiter?',
        'What other instruments complement radar sounding?',
      ],
      chipAnswers: {
        'How does REASON map ice thickness between 15-25 km?':
          'By measuring the time-of-flight delay and dielectric attenuation between the surface reflection and the basal ice-ocean interface reflection during 49 low-altitude flybys (down to 25 km altitude).',
        'What are the radiation hardening precautions at Jupiter?':
          'Clipper orbits Jupiter in a wide elliptical trajectory rather than orbiting Europa directly, dipping rapidly through Jupiter’s intense magnetospheric radiation belt and housing avionics inside a 150-kg titanium-aluminum vault.',
        'What other instruments complement radar sounding?':
          'MASPEX (mass spectrometer) and SUDA (dust analyzer) sample cryovolcanic plumes directly, while the Europa-UVS and MISE infrared spectrometer map surface organics and salts.',
      },
    },
  },
  {
    id: 'curiosity-silica-halos',
    missionKey: 'Curiosity',
    title: 'Why Mars is Red & Curiosity Silica Halos',
    category: 'mars',
    badgeLabel: 'Mars Surface Science',
    statusLabel: 'Sol 4340+ Drilling',
    accentColor: 'orange',
    thumbnailUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260827_202133_0ba6de7c-285d-43dc-b7ab-8c54c73707cb.png',
    fallbackThumbnailUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260827_202133_0ba6de7c-285d-43dc-b7ab-8c54c73707cb.png',
    description:
      "Why is Mars red and what for did Curiosity find silica? Mars's ferric oxide dust causes its red appearance, while Curiosity drilled into high-purity silica opal networks that prove water persisted in Gale Crater far longer than previously thought.",
    telemetry: [
      { label: 'Target', value: 'Mount Sharp Slopes' },
      { label: 'Odometer', value: '32.84 km Run' },
      { label: 'Mineralogy', value: 'Hydrated Opal Silica' },
      { label: 'Instrument', value: 'CheMin X-Ray Diff' },
    ],
    footerTimeLabel: 'Yesterday • JPL Mars Lab',
    footerTimeIcon: 'clock',
    articleLabel: 'NASA Mars Report',
    nasaArticleUrl: 'https://science.nasa.gov/mission/msl-curiosity/',
    queryPrompt: 'Why is Mars red and what formed its silica halos in Gale Crater?',
    copilot: {
      title: 'Curiosity Mars Rover / Silica in Gale Crater',
      synthesis:
        'SpaceAI Mars Science: Mars owes its rusty color to nanophase ferric oxide (Fe₂O₃) dust blanketing the planet. Along fracture zones in Gale Crater, Curiosity’s ChemCam and DAN neutron spectrometer discovered bright halos enriched in up to 90% amorphous hydrated opaline silica—proving subsurface groundwater flowed long after ancient lakes dried.',
      chips: [
        'Why does silica indicate ancient groundwater activity?',
        "What did Curiosity's CheMin instrument measure?",
        'How does Gale Crater compare to Jezero Crater?',
      ],
      chipAnswers: {
        'Why does silica indicate ancient groundwater activity?':
          'Acidic groundwater leaches mobile elements out of basaltic bedrock while leaving silica behind, or alkaline water precipitates dissolved silica into fractures—both requiring sustained liquid water circulation.',
        "What did Curiosity's CheMin instrument measure?":
          'CheMin fires a focused cobalt X-ray beam through powdered drill samples, identifying tridymite, cristobalite, and Opal-A/Opal-CT signatures indicative of silica-rich hydrothermal and groundwater alteration.',
        'How does Gale Crater compare to Jezero Crater?':
          'Gale Crater (Curiosity) preserves a 5-km sedimentary mountain recording transition from clay-rich lakes to sulfate deserts, whereas Jezero Crater (Perseverance) preserves an ancient river-delta system and carbonate shoreline.',
      },
    },
  },
  {
    id: 'voyager-1-interstellar',
    missionKey: 'Voyager 1',
    title: 'Voyager 1: Thruster Reconfiguration & Interstellar Telemetry',
    category: 'deepspace',
    badgeLabel: 'Interstellar Flagship',
    statusLabel: 'Live Carrier Lock • 163.2 AU',
    accentColor: 'sky',
    thumbnailUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260827_202133_508c64b8-a31e-4290-bdfc-1187df70e0a6.png',
    fallbackThumbnailUrl:
      'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260827_202133_508c64b8-a31e-4290-bdfc-1187df70e0a6.png',
    description:
      'Operating in interstellar space over 24.4 billion kilometers from Earth, NASA JPL engineers successfully switched Voyager 1 to its secondary thruster branch after silicon dioxide buildup narrowed fuel tubes, maintaining high-gain antenna lock with Earth.',
    telemetry: [
      { label: 'Distance', value: '24.41B km (163.2 AU)' },
      { label: 'Light Time', value: '22h 38m One-Way' },
      { label: 'Propulsion', value: 'Thruster Branch B' },
      { label: 'RTG Power', value: '224W Remaining' },
    ],
    footerTimeLabel: 'Live Carrier Lock • DSN Madrid DSS-63',
    footerTimeIcon: 'clock',
    articleLabel: 'NASA Voyager Data',
    nasaArticleUrl: 'https://science.nasa.gov/mission/voyager/voyager-1/',
    queryPrompt:
      'How did NASA JPL restore Voyager 1 telemetry and switch thrusters at 163 AU in interstellar space?',
    copilot: {
      title: 'Voyager 1 Interstellar Telemetry & Thruster Switch',
      synthesis:
        'SpaceAI Deep Space Network: At 163.2 AU (24.41 billion km), radio signals require 22 hours and 38 minutes one-way to reach Voyager 1. JPL engineers warmed dormant trajectory correction thrusters using scarce plutonium-238 RTG heater power to keep the 3.7-meter high-gain dish aimed squarely at Earth.',
      chips: [
        'Why did the primary attitude thrusters clog?',
        'How does DSN detect a 20-watt signal from 24 billion km?',
        'What instruments are still active in interstellar space?',
      ],
      chipAnswers: {
        'Why did the primary attitude thrusters clog?':
          'Over 47 years in space, a rubber diaphragm inside the hydrazine propellant tank slowly degraded, releasing microscopic silicon dioxide byproduct that narrowed the 0.25-mm thruster inlet tubes.',
        'How does DSN detect a 20-watt signal from 24 billion km?':
          'NASA arrays 70-meter and 34-meter dish antennas in Goldstone, Madrid, and Canberra equipped with cryogenic maser amplifiers cooled near absolute zero to lock onto a signal attenuated to a billionth-of-a-billionth of a watt.',
        'What instruments are still active in interstellar space?':
          'Four instruments remain operational: the Cosmic Ray Subsystem (CRS), Low-Energy Charged Particle (LECP) instrument, Magnetometer (MAG), and Plasma Wave Subsystem (PWS) measuring the local interstellar medium.',
      },
    },
  },
];

interface MissionAlertsProps {
  onSelectPrompt?: (prompt: string) => void;
}

export const MissionAlerts: React.FC<MissionAlertsProps> = ({ onSelectPrompt }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<MissionCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [utcTime, setUtcTime] = useState('18:45:00 UTC');

  // Slide-Out SpaceAI Telemetry Copilot state
  const [activeCopilotMission, setActiveCopilotMission] = useState<MissionEvent | null>(null);
  const [copilotResponse, setCopilotResponse] = useState<string>('');
  const [copilotInput, setCopilotInput] = useState<string>('');

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Procedural Cosmic Web Audio Engine
  const playTone = useCallback(
    (type: 'tab' | 'inquire' | 'ask' | 'open') => {
      if (!soundEnabled || typeof window === 'undefined') return;
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'tab') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.exponentialRampToValueAtTime(680, now + 0.06);
          gain.gain.setValueAtTime(0.035, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
          osc.start(now);
          osc.stop(now + 0.07);
        } else if (type === 'inquire') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
          gain.gain.setValueAtTime(0.045, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
          osc.start(now);
          osc.stop(now + 0.15);
        } else if (type === 'ask') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(660, now);
          osc.frequency.exponentialRampToValueAtTime(990, now + 0.11);
          gain.gain.setValueAtTime(0.04, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
          osc.start(now);
          osc.stop(now + 0.12);
        } else if (type === 'open') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(380, now);
          osc.frequency.exponentialRampToValueAtTime(760, now + 0.12);
          gain.gain.setValueAtTime(0.03, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
          osc.start(now);
          osc.stop(now + 0.13);
        }
      } catch {
        // Ignore audio context autoplay restrictions
      }
    },
    [soundEnabled]
  );

  // Live UTC Clock Ticker
  useEffect(() => {
    if (!isOpen) return;
    const updateClock = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${h}:${m}:${s} UTC`);
    };
    updateClock();
    const timer = window.setInterval(updateClock, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen]);

  // Esc key listener to close drawer or modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        if (activeCopilotMission) {
          setActiveCopilotMission(null);
        } else {
          setIsOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, activeCopilotMission]);

  // Lock body scroll while modal is active
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleOpenModal = () => {
    setIsOpen(true);
    playTone('open');
  };

  const handleCategoryChange = (cat: MissionCategory) => {
    setActiveCategory(cat);
    playTone('tab');
  };

  const handleOpenCopilot = (event: MissionEvent) => {
    playTone('inquire');
    setActiveCopilotMission(event);
    setCopilotResponse(event.copilot.synthesis);
    setCopilotInput('');
  };

  const handleCopilotAsk = (customQuestion?: string) => {
    const q = (customQuestion ?? copilotInput).trim();
    if (!q || !activeCopilotMission) return;
    playTone('ask');
    const predefined = activeCopilotMission.copilot.chipAnswers[q];
    if (predefined) {
      setCopilotResponse(`Inquiry: "${q}"\n\nJPL Telemetry Synthesizer: ${predefined}`);
    } else {
      setCopilotResponse(
        `Inquiry: "${q}"\n\nJPL Telemetry Synthesizer: Processing ephemeris vectors and science telemetry for ${activeCopilotMission.title}. Telemetry carrier synchronized with Deep Space Network (8.4 GHz X-Band).`
      );
    }
    setCopilotInput('');
  };

  const handleLaunchFullSpaceAI = (prompt: string) => {
    setActiveCopilotMission(null);
    setIsOpen(false);
    if (onSelectPrompt) {
      onSelectPrompt(prompt);
    }
  };

  const filteredMissions = UPCOMING_MISSION_ALERTS.filter((m) => {
    const matchesCat = activeCategory === 'all' || m.category === activeCategory;
    if (!matchesCat) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      m.title.toLowerCase().includes(q) ||
      m.description.toLowerCase().includes(q) ||
      m.badgeLabel.toLowerCase().includes(q) ||
      m.telemetry.some(
        (t) => t.label.toLowerCase().includes(q) || t.value.toLowerCase().includes(q)
      )
    );
  });

  const tabs: { id: MissionCategory; label: string; count: number }[] = [
    { id: 'all', label: 'All Events', count: 5 },
    { id: 'crewed', label: 'Crewed Lunar', count: 1 },
    { id: 'astronomy', label: 'Conjunctions', count: 1 },
    { id: 'deepspace', label: 'Deep Space & Icy Moons', count: 2 },
    { id: 'mars', label: 'Mars Surface', count: 1 },
  ];

  const getAccentClasses = (accent: MissionEvent['accentColor']) => {
    switch (accent) {
      case 'amber':
        return {
          cardHover:
            'hover:border-sky-500/40 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.7),0_0_20px_rgba(56,189,248,0.1)]',
          badge: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
          dot: 'bg-amber-400 shadow-[0_0_5px_#f59e0b]',
          titleHover: 'group-hover:text-sky-300',
          iconHover: 'group-hover:text-sky-400',
          inquireBtn:
            'text-sky-400 hover:text-white bg-sky-500/10 hover:bg-sky-500/25 border-sky-400/30 hover:border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.15)]',
          inquireChevron: 'text-sky-300',
        };
      case 'emerald':
        return {
          cardHover:
            'hover:border-emerald-500/40 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.7),0_0_20px_rgba(16,185,129,0.1)]',
          badge: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
          dot: 'bg-emerald-400 shadow-[0_0_5px_#10b981]',
          titleHover: 'group-hover:text-emerald-300',
          iconHover: 'group-hover:text-emerald-400',
          inquireBtn:
            'text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/25 border-emerald-400/30 hover:border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)]',
          inquireChevron: 'text-emerald-300',
        };
      case 'cyan':
        return {
          cardHover:
            'hover:border-cyan-500/40 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.7),0_0_20px_rgba(6,182,212,0.1)]',
          badge: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
          dot: 'bg-cyan-400 shadow-[0_0_5px_#22d3ee]',
          titleHover: 'group-hover:text-cyan-300',
          iconHover: 'group-hover:text-cyan-400',
          inquireBtn:
            'text-cyan-400 hover:text-white bg-cyan-500/10 hover:bg-cyan-500/25 border-cyan-400/30 hover:border-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.15)]',
          inquireChevron: 'text-cyan-300',
        };
      case 'orange':
        return {
          cardHover:
            'hover:border-orange-500/40 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.7),0_0_20px_rgba(249,115,22,0.1)]',
          badge: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
          dot: 'bg-orange-400 shadow-[0_0_5px_#f97316]',
          titleHover: 'group-hover:text-orange-300',
          iconHover: 'group-hover:text-orange-400',
          inquireBtn:
            'text-orange-400 hover:text-white bg-orange-500/10 hover:bg-orange-500/25 border-orange-400/30 hover:border-orange-400 shadow-[0_0_12px_rgba(249,115,22,0.15)]',
          inquireChevron: 'text-orange-300',
        };
      default:
        return {
          cardHover:
            'hover:border-sky-500/40 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.7),0_0_20px_rgba(56,189,248,0.1)]',
          badge: 'bg-sky-500/10 border-sky-500/30 text-sky-400',
          dot: 'bg-sky-400 shadow-[0_0_5px_#38bdf8]',
          titleHover: 'group-hover:text-sky-300',
          iconHover: 'group-hover:text-sky-400',
          inquireBtn:
            'text-sky-400 hover:text-white bg-sky-500/10 hover:bg-sky-500/25 border-sky-400/30 hover:border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.15)]',
          inquireChevron: 'text-sky-300',
        };
    }
  };

  return (
    <>
      {/* Top Navigation Status Pill: glowing cyan pulse dot, "Alerts", and count badge 5 */}
      <button
        type="button"
        onClick={handleOpenModal}
        aria-label="Open NASA Mission Alerts"
        title="NASA Mission Alerts: Real-time orbital trajectories, launch windows, and observatory milestones"
        className="relative group inline-flex items-center gap-2 h-[34px] px-3.5 rounded-full bg-[#0F1E38]/80 hover:bg-[#162A4D]/90 border border-[#38BDF8]/40 hover:border-[#38BDF8]/70 shadow-[0_0_20px_rgba(56,189,248,0.22)] backdrop-blur-md transition-all duration-200 cursor-pointer active:scale-95 select-none"
      >
        <span className="relative flex h-2 w-2 items-center justify-center">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#38BDF8] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#38BDF8] shadow-[0_0_8px_#38BDF8]" />
        </span>

        <span className="text-[13px] font-medium text-[#F8FAFC]">
          Alerts
        </span>
      </button>

      {/* NASA Mission Alerts — Modernized Command Center Full-Window Redesign */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 lg:p-6 bg-[#030712]/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-hidden"
            onClick={() => setIsOpen(false)}
          >
            {/* Ambient Aerospace Glows */}
            <div className="fixed inset-0 pointer-events-none z-0">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(14,52,90,0.4),transparent)]" />
              <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(30,58,138,0.25),transparent_70%)]" />
              <div className="absolute top-1/3 left-0 w-[500px] h-[500px] bg-[radial-gradient(circle,rgba(15,30,65,0.35),transparent_70%)]" />
            </div>

            {/* Redesigned Aerospace HUD Window Shell */}
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="mission-alerts-title"
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-6xl bg-[#0a1120]/95 backdrop-blur-2xl border border-sky-500/20 rounded-2xl shadow-[0_25px_70px_-15px_rgba(0,0,0,0.8),0_0_40px_-10px_rgba(56,189,248,0.15)] overflow-hidden flex flex-col max-h-[92vh] transition-all"
            >
              {/* 1. Aerospace HUD Header */}
              <header className="p-4 sm:p-6 border-b border-white/10 bg-gradient-to-b from-sky-950/30 to-transparent flex flex-wrap items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-4">
                  {/* Rocket Insignia Badge with spinning orbital ring */}
                  <div className="relative w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-600/5 border border-sky-400/30 shadow-[0_0_15px_rgba(56,189,248,0.25)] flex items-center justify-center text-sky-400 shrink-0">
                    <Rocket className="w-6 h-6" />
                    <div className="absolute -inset-1 rounded-2xl border border-dashed border-sky-400/30 animate-[spin_20s_linear_infinite] pointer-events-none" />
                  </div>

                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <h2
                        id="mission-alerts-title"
                        className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2"
                      >
                        NASA Mission Alerts
                      </h2>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold tracking-wide uppercase shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5 max-w-2xl">
                      Real-time updates on orbital trajectories, launch windows, celestial conjunctions, and observatory milestones.
                    </p>
                  </div>
                </div>

                {/* Right Side: Window Controls */}
                <div className="flex items-center gap-2.5 ml-auto">

                  {/* Sound Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setSoundEnabled((s) => !s)}
                    className={`w-9 h-9 rounded-lg border flex items-center justify-center transition cursor-pointer ${
                      soundEnabled
                        ? 'bg-white/5 hover:bg-white/10 border-white/10 text-sky-400 hover:text-white'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-500 hover:text-slate-300'
                    }`}
                    title={soundEnabled ? 'Mute Telemetry Audio FX' : 'Enable Telemetry Audio FX'}
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4" />
                    ) : (
                      <VolumeX className="w-4 h-4" />
                    )}
                  </button>

                  {/* Close Window Icon */}
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="w-9 h-9 rounded-lg bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/40 flex items-center justify-center text-slate-400 hover:text-red-400 transition cursor-pointer"
                    title="Close Window"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </header>

              {/* 3. Redesigned High-Fidelity Cards Deck */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-[#080e1c]/60">
                {filteredMissions.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-sm">
                    No active NASA telemetry events available.
                  </div>
                ) : (
                  <div
                    className={
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 lg:grid-cols-2 gap-5'
                        : 'flex flex-col gap-4'
                    }
                  >
                    {filteredMissions.map((event) => {
                      const styles = getAccentClasses(event.accentColor);
                      return (
                        <article
                          key={event.id}
                          className={`group bg-slate-900/60 hover:bg-slate-800/80 border border-white/10 ${styles.cardHover} rounded-xl p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:-translate-y-0.5 relative`}
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex items-start gap-4">
                              {/* High-Res Celestial / Mission Visual */}
                              <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-950 border border-white/15 shrink-0 relative">
                                <img
                                  src={event.thumbnailUrl}
                                  onError={(e) => {
                                    const target = e.currentTarget;
                                    if (target.src !== event.fallbackThumbnailUrl) {
                                      target.src = event.fallbackThumbnailUrl;
                                    }
                                  }}
                                  alt={event.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                                />
                              </div>

                              <div className="flex-1 min-w-0">
                                <a
                                  href={event.nasaArticleUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`text-base font-bold text-white ${styles.titleHover} transition inline-flex items-center gap-1.5`}
                                >
                                  <span>{event.title}</span>
                                  <ExternalLink
                                    className={`w-4 h-4 text-slate-500 ${styles.iconHover} transition shrink-0`}
                                  />
                                </a>
                              </div>
                            </div>

                            <p className="text-xs text-slate-300 leading-relaxed">
                              {event.description}
                            </p>

                            {/* 4-Cell Aerospace Telemetry Matrix Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-950/60 border border-white/5 rounded-lg p-2.5 font-mono text-[11px]">
                              {event.telemetry.map((cell, idx) => (
                                <div key={idx}>
                                  <div className="text-[9px] text-slate-500 uppercase">
                                    {cell.label}
                                  </div>
                                  <div className="text-slate-200 font-medium truncate">
                                    {cell.value}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Card Footer */}
                          <div className="pt-3 border-t border-white/5 flex flex-wrap items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                              {event.footerTimeIcon === 'calendar' ? (
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-slate-500" />
                              )}
                              {event.footerTimeLabel}
                            </span>

                            <div className="flex items-center gap-2">
                              <a
                                href={event.nasaArticleUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition inline-flex items-center gap-1"
                              >
                                <span>{event.articleLabel}</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>

                              <button
                                type="button"
                                onClick={() => handleOpenCopilot(event)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition inline-flex items-center justify-center cursor-pointer active:scale-95 ${styles.inquireBtn}`}
                              >
                                <span>Inquire in SpaceAI</span>
                              </button>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 4. Footer Telemetry Strip */}
              <footer className="px-5 sm:px-6 py-3 border-t border-white/5 bg-slate-950/80 flex flex-wrap items-center justify-between gap-4 font-mono text-[11px] text-slate-500 shrink-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-emerald-400">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    NASA JPL Horizons &amp; Open Data Link: OK (200)
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href="https://data.nasa.gov"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-slate-400 hover:text-sky-400 transition"
                  >
                    data.nasa.gov
                  </a>
                </div>
              </footer>

              {/* 5. Slide-Out SpaceAI Telemetry Copilot Drawer */}
              <aside
                className={`absolute top-0 right-0 bottom-0 w-96 max-w-full bg-slate-900/98 backdrop-blur-2xl border-l border-sky-500/30 shadow-2xl z-50 transform transition-transform duration-300 flex flex-col ${
                  activeCopilotMission ? 'translate-x-0' : 'translate-x-full pointer-events-none'
                }`}
              >
                <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/40">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 text-sky-400 flex items-center justify-center font-bold text-xs">
                      AI
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">SpaceAI Telemetry Copilot</h4>
                      <p className="text-[10px] font-mono text-slate-400">
                        JPL Horizons Mission Synthesis
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveCopilotMission(null)}
                    className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition cursor-pointer"
                    aria-label="Close Copilot Drawer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {activeCopilotMission && (
                  <>
                    <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3 text-xs">
                      <div className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3">
                        <div className="text-[10px] font-mono text-sky-400 uppercase tracking-wider mb-1">
                          Target Mission
                        </div>
                        <div className="font-bold text-white">
                          {activeCopilotMission.copilot.title}
                        </div>
                      </div>

                      <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-slate-200 leading-relaxed whitespace-pre-line">
                        {copilotResponse}
                      </div>

                      <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mt-1">
                        Deep Questions
                      </div>
                      <div className="flex flex-col gap-1.5">
                        {activeCopilotMission.copilot.chips.map((q) => (
                          <button
                            key={q}
                            type="button"
                            onClick={() => handleCopilotAsk(q)}
                            className="text-left bg-white/5 hover:bg-sky-500/10 border border-white/5 hover:border-sky-500/30 p-2.5 rounded-lg text-slate-300 hover:text-sky-300 transition cursor-pointer"
                          >
                            &rarr; {q}
                          </button>
                        ))}
                      </div>

                      {/* Deep Launch into Main SpaceAI Workspace */}
                      <button
                        type="button"
                        onClick={() => handleLaunchFullSpaceAI(activeCopilotMission.queryPrompt)}
                        className="mt-2 w-full py-2 px-3 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-300 hover:text-white font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Open Full SpaceAI Briefing</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        handleCopilotAsk();
                      }}
                      className="p-3 border-t border-white/10 bg-slate-950/60 flex gap-2"
                    >
                      <input
                        type="text"
                        value={copilotInput}
                        onChange={(e) => setCopilotInput(e.target.value)}
                        placeholder="Ask about this trajectory..."
                        className="flex-1 bg-slate-900 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-sky-500"
                      />
                      <button
                        type="submit"
                        className="bg-sky-500 hover:bg-sky-400 text-slate-950 px-3 py-1.5 rounded-lg font-bold text-xs transition inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Ask</span>
                        <Send className="w-3 h-3" />
                      </button>
                    </form>
                  </>
                )}
              </aside>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
