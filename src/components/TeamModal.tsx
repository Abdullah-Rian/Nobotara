import React from 'react';

export interface TeamMember {
  name: string;
  role: string;
  tag: string;
  initials: string;
  avatarUrl?: string;
  isDirector?: boolean;
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    name: 'Samin Yeasar Sarra',
    role: 'Team Lead & Project Director',
    tag: 'DIRECTOR',
    initials: 'SS',
    avatarUrl: '/team/samin_yeasar_sarra.jpg',
    isDirector: true,
  },
  {
    name: 'Arijit Talukder',
    role: 'Web Developer & UI Designer',
    tag: 'WEB DEV',
    initials: 'AT',
    avatarUrl: '/team/arijit_talukder.jpg',
  },
  {
    name: 'Abdullah Al Mustasim',
    role: 'AI & Deployment Engineer',
    tag: 'WEB DEV',
    initials: 'AM',
    avatarUrl: '/team/abdullah_al_mustasim.jpg',
  },
  {
    name: 'Md Ferdouse Oahid',
    role: 'Game Developer',
    tag: 'GAME DEV',
    initials: 'MF',
    avatarUrl: '/team/Ferdouse_PP_1254.png',

  },
  {
    name: 'Sagar Karmakar',
    role: 'Multimedia Editor & Research Associate',
    tag: 'MEDIA',
    initials: 'SK',
    // No photo yet: the card shows the initials. Add /team/sagar_karmakar.jpg and set avatarUrl.
  },

];

interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlaySfx?: () => void;
}

export const TeamModal: React.FC<TeamModalProps> = ({
  isOpen,
  onClose,
  onPlaySfx,
}) => {
  if (!isOpen) return null;

  const handleClose = () => {
    onPlaySfx?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/55 backdrop-blur-xl flex items-center justify-center p-3 sm:p-7 select-text animate-in fade-in duration-200 "
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Outer Panel matching exact specifications (zero white glow) */}
      <div
        className="relative w-full max-w-[680px] max-h-[min(690px,calc(100vh-56px))] p-6 sm:p-8 flex flex-col overflow-hidden rounded-[26px] border border-white/[0.17] select-none text-[#f5f5f5] "
        style={{
          background: 'linear-gradient(145deg, rgba(25,26,29,0.98), rgba(14,15,17,0.99) 62%)',
          boxShadow: '0 32px 100px rgba(0,0,0,0.62), inset 0 1px 0 rgba(255,255,255,0.055)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Minimal Text-Focused Header: "Nobotara71 Personnel " (Members: 5) */}
        <header className="flex items-center justify-between gap-4 pb-5 border-b border-white/[0.095] shrink-0">
          <div className="flex items-baseline gap-2.5 flex-wrap min-w-0">
            <h1 className="m-0 text-[20px] sm:text-[23px] font-bold tracking-[-0.035em] text-[#ffffff] leading-snug">
              Nobotara71 Personnel
            </h1>
            <span className="text-sm font-medium text-[#a1a1aa] tracking-tight">
              (Members: {TEAM_MEMBERS.length})
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            aria-label="Close team panel"
            className="w-[36px] h-[36px] rounded-full grid place-items-center border border-white/[0.17] text-[#e8e8ea] bg-white/[0.035] hover:bg-white/[0.11] hover:border-white/[0.35] transition-all cursor-pointer shrink-0"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {/* Scrollable Members List with Circular Avatars */}
        <section className="flex-1 overflow-y-auto space-y-2.5 pt-4 pr-1 min-h-0" aria-label="Team members">
          {TEAM_MEMBERS.map((member) => (
            <article
              key={member.name}
              tabIndex={0}
              className="min-h-[76px] p-3 sm:px-4 rounded-[17px] border border-white/[0.095] hover:border-white/20 transition-all flex items-center gap-3.5 sm:gap-4 cursor-default"
              style={{
                background: 'linear-gradient(110deg, rgba(255,255,255,0.045), rgba(255,255,255,0.018))',
              }}
            >
              {/* Circular Avatar (47px x 47px) */}
              <div
                className="w-[47px] h-[47px] rounded-full shrink-0 flex items-center justify-center overflow-hidden border font-bold text-[13px] tracking-[-0.035em]"
                style={
                  member.avatarUrl
                    ? { borderColor: 'rgba(255,255,255,0.2)' }
                    : {
                        background: 'linear-gradient(145deg, #2a2b2f, #18191c)',
                        color: '#f0f0f1',
                        borderColor: 'rgba(255,255,255,0.2)',
                      }
                }
                aria-hidden="true"
              >
                {member.avatarUrl ? (
                  <img
                    src={member.avatarUrl}
                    alt={member.name}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span>{member.initials}</span>
                )}
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1">
                <h2 className="m-0 mb-1 text-[14px] font-bold text-[#f1f1f2] leading-snug tracking-[-0.02em] truncate">
                  {member.name}
                </h2>
                <p className="m-0 text-[12px] text-[#a1a1aa] leading-relaxed truncate">
                  {member.role}
                </p>
              </div>

              {/* Tag Badge */}
              <span className="shrink-0 px-2.5 py-1.5 border border-white/[0.18] rounded-[7px] text-[#d7d8dc] bg-white/[0.035] text-[9px] font-bold tracking-[0.09em] uppercase whitespace-nowrap leading-none">
                {member.tag}
              </span>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};
