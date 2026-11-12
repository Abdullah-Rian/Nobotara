import { useEffect, useRef, useState } from 'react';
import { apolloAudio } from '../audio/apolloAudio';

const TYPE_MS = 12;
const START_DELAY_MS = 1000;
const FADE_AFTER_MS = 6500;

/** Seconds from mount until the last character, including the one-second wait. */
export function introTitleLeadSeconds(line1: string, line2 = '') {
  return (START_DELAY_MS + (line1.length + line2.length) * TYPE_MS) / 1000;
}

/**
 * Opening title. Waits one second, then types on with the dialogue cursor and
 * its tick, skipping the tick on the final character. The cursor leaves when
 * the last character is shown. Fades out 6.5 seconds after it appears. A
 * second line is optional.
 */
export function MissionIntroTitle({
  line1,
  line2 = '',
  onTyped
}: {
  line1: string;
  line2?: string;
  onTyped: () => void;
}) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const [faded, setFaded] = useState(false);
  const onTypedRef = useRef(onTyped);
  onTypedRef.current = onTyped;
  const hasSecond = line2.length > 0;
  const total = line1.length + line2.length;
  const typing = started && count < total;
  const onSecond = hasSecond && count >= line1.length;
  const shown1 = line1.slice(0, Math.min(count, line1.length));
  const shown2 = line2.slice(0, Math.max(0, count - line1.length));

  useEffect(() => {
    let revealed = 0;
    let alive = true;
    let timer = 0;
    const start = window.setTimeout(() => {
      if (!alive) return;
      setStarted(true);
      timer = window.setInterval(() => {
        if (!alive) return;
        revealed += 1;
        if (revealed < total && revealed % 4 === 1) apolloAudio.playTypeBeep();
        setCount(revealed);
        if (revealed >= total) {
          window.clearInterval(timer);
          onTypedRef.current();
        }
      }, TYPE_MS);
    }, START_DELAY_MS);
    const fade = window.setTimeout(() => {
      if (alive) setFaded(true);
    }, FADE_AFTER_MS);
    return () => {
      alive = false;
      window.clearTimeout(start);
      window.clearInterval(timer);
      window.clearTimeout(fade);
    };
  }, [total]);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-28 z-20 px-6 text-center text-white drop-shadow transition-opacity duration-[800ms]"
      style={{ opacity: faded ? 0 : 1 }}
    >
      <h1 className="grid text-[1.15rem] font-extrabold md:text-[1.85rem]">
        <span className="invisible col-start-1 row-start-1" aria-hidden="true">
          {line1}
        </span>
        <span className="col-start-1 row-start-1">
          {shown1}
          {typing && !onSecond && <span className="dialogue-cursor" aria-hidden="true" />}
        </span>
      </h1>
      {hasSecond && (
        <p className="mt-1 grid text-[0.79rem] font-bold md:text-[1.26rem]">
          <span className="invisible col-start-1 row-start-1" aria-hidden="true">
            {line2}
          </span>
          <span className="col-start-1 row-start-1">
            {shown2}
            {typing && onSecond && <span className="dialogue-cursor" aria-hidden="true" />}
          </span>
        </p>
      )}
    </div>
  );
}
