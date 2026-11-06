import React, { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { ConversationHistoryItem } from '../types/chat';

export const defaultQueries: ConversationHistoryItem[] = [
  {
    id: 'conv-1',
    question: 'What was the mission flight path for Artemis I?',
    time: '2 hours ago',
    fullAnswer:
      'Launched November 16, 2022 from Kennedy Space Center Launch Pad 39B atop the Space Launch System (SLS) Block 1 rocket, Artemis I propelled the uncrewed Orion spacecraft on a 25.5-day translunar mission. Following interim cryogenic propulsion stage (ICPS) translunar injection, Orion performed a powered outbound lunar flyby 130 km above the lunar surface to enter a Distant Retrograde Orbit (DRO)—traveling 432,210 km from Earth, the farthest any human-rated spacecraft has ever flown—before executing a return powered flyby and skip-entry splashdown in the Pacific Ocean.',
    metrics: [
      { label: 'Mission Duration', value: '25d 10h 53m' },
      { label: 'Max Earth Distance', value: '432,210 km', delta: 'Record Apogee' },
      { label: 'Total Flight Path', value: '2.25M km' },
    ],
    topic: 'Artemis I Mission',
    nasaUrl: 'https://www.nasa.gov/mission/artemis-i/',
  },
  {
    id: 'conv-2',
    question: 'Why is Mars red and what formed its colossal Olympus Mons volcano?',
    time: 'Yesterday',
    fullAnswer:
      "Mars gets its iconic rusty hue from abundant ferric oxide (Fe₂O₃ rust) across its basaltic crust, pulverized into micro-fine dust over billions of years by solar UV and hyper-arid winds. Its topography hosts Olympus Mons—the solar system's largest shield volcano standing 21.9 km tall (nearly 2.5 times Mount Everest) and 600 km wide. Because Mars lacks mobile tectonic plates, crustal hotspots remained stationary beneath the crust for hundreds of millions of years, continuously layering basalt lava flows into an immense planetary shield.",
    metrics: [
      { label: 'Dominant Mineral', value: 'Ferric Oxide (Fe₂O₃)' },
      { label: 'Olympus Mons Peak', value: '21.9 km alt', delta: 'Solar System Max' },
      { label: 'Atmospheric Pressure', value: '0.6 kPa (CO₂)' },
    ],
    topic: 'Mars & Olympus Mons',
    nasaUrl: 'https://science.nasa.gov/mars/',
  },
  {
    id: 'conv-3',
    question: 'Can sound travel through space, and what did Apollo 10 hear on the Moon?',
    time: '3 days ago',
    fullAnswer:
      'True acoustic sound waves require an atomic or molecular medium to compress and propagate, meaning sound cannot travel across the near-vacuum of space. However, in May 1969, as Apollo 10 flew behind the far side of the Moon—out of all communication with Earth—astronauts Thomas Stafford, John Young, and Eugene Cernan heard an eerie whistling "space music" inside their headsets. NASA transcripts revealed this was electromagnetic VHF radio interference: the VHF transceivers of the Lunar Module and Command Module were oscillating close to each other, creating an audible beating tone in the crew\'s analog audio loop.',
    metrics: [
      { label: 'Space Sound Medium', value: 'Vacuum (0 dB)' },
      { label: 'Signal Phenomenon', value: 'VHF Heterodyne Beat', delta: 'RF Interference' },
      { label: 'Lunar Far Side Blackout', value: '47 mins' },
    ],
    topic: 'Apollo 10 Radio Transcripts',
    nasaUrl: 'https://www.nasa.gov/mission/apollo-10/',
  },
  {
    id: 'conv-4',
    question: 'How does the James Webb Space Telescope detect atmospheres on TRAPPIST-1 exoplanets?',
    time: 'Oct 21',
    fullAnswer:
      'JWST uses transmission spectroscopy via its NIRSpec and MIRI instruments at Sun-Earth Lagrange Point 2 (1.5 million km from Earth). When an exoplanet transits in front of its host M-dwarf star, stellar light filters through the outer atmospheric perimeter. Specific gases absorb characteristic infrared wavelengths, creating chemical absorption fingerprints for carbon dioxide (CO₂), methane (CH₄), ozone, and water vapor (H₂O) across alien worlds.',
    metrics: [
      { label: 'Station Location', value: 'Sun-Earth L2' },
      { label: 'Primary Mirror Diameter', value: '6.5 meters', delta: 'Gold-Beryllium' },
      { label: 'Spectral Detection', value: '0.6 - 28 µm' },
    ],
    topic: 'JWST & TRAPPIST-1 Exoplanets',
    nasaUrl: 'https://science.nasa.gov/mission/webb/',
  },
];

interface RecentConversationsProps {
  onSelectConversation: (item: ConversationHistoryItem) => void;
  activeId?: string | null;
}

export const RecentConversations: React.FC<RecentConversationsProps> = ({
  onSelectConversation,
  activeId,
}) => {
  const [showAll, setShowAll] = useState(false);
  const visibleItems = showAll ? defaultQueries : defaultQueries.slice(0, 2);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 mt-10 mb-6 md:mt-0 md:mb-2 flex flex-col items-center">
      <button
        type="button"
        onClick={() => setShowAll((prev) => !prev)}
        className="text-[13px] font-normal text-[#94A3B8] hover:text-[#E2E8F0] transition-colors mb-3.5 md:mb-2.5 select-none cursor-pointer"
        title="Click to toggle queries"
      >
        {showAll ? 'Collapse' : 'Expand'}
      </button>

      <div className="flex flex-wrap items-center justify-center gap-3 w-full">
        {visibleItems.map((item) => {
          const isSelected = activeId === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectConversation(item)}
              className={`group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full transition-all duration-200 cursor-pointer backdrop-blur-xl max-w-[380px] sm:max-w-[410px] ${
                isSelected
                  ? 'bg-[#38BDF8]/15 border border-[#38BDF8]/45 text-white shadow-[0_8px_24px_rgba(0,0,0,0.4)]'
                  : 'bg-[#0F172A]/75 border border-white/[0.12] hover:bg-white/[0.07] hover:border-white/[0.22] text-[#E2E8F0]'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#64748B] group-hover:text-[#38BDF8] shrink-0 transition-colors" />
              <span className="text-[13px] font-normal text-[#E2E8F0] group-hover:text-white truncate">
                {item.question}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
