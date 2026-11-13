import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Speak instead of type, using the browser's own speech-to-text (free, no key).
 * Chrome, Edge and Safari (including iPhone) have it; Firefox does not, so `supported` is false there
 * and the mic button is hidden. The browser asks for microphone permission on first use.
 *
 * Words appear in the text box as they are heard; nothing is sent until the user presses Send.
 */

type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const join = (a: string, b: string) => (a && b ? `${a.replace(/\s+$/, '')} ${b.replace(/^\s+/, '')}` : a || b);

export function useSpeechInput(text: string, setText: (value: string) => void) {
  const [supported] = useState(() => recognitionCtor() !== null);
  const [listening, setListening] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const recRef = useRef<Recognition | null>(null);
  const textRef = useRef(text);
  const setTextRef = useRef(setText);
  textRef.current = text;
  setTextRef.current = setText;

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = recognitionCtor();
    if (!Ctor || recRef.current) return;
    setProblem(null);

    const rec = new Ctor();
    rec.lang = navigator.language?.startsWith('en') ? navigator.language : 'en-US';
    rec.interimResults = true;
    rec.continuous = false; // one question at a time; stops by itself after a pause

    const before = textRef.current; // what was typed before speaking
    let heard = '';

    rec.onresult = (e) => {
      let finalText = '';
      let interim = '';
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      heard = join(finalText, interim);
      setTextRef.current(join(before, heard));
    };
    rec.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setProblem('Microphone is blocked. Allow it in your browser settings to speak your question.');
      } else if (e.error === 'no-speech') {
        setProblem("I didn't hear anything. Tap the mic and try again.");
      } else if (e.error === 'network') {
        setProblem('Speech needs an internet connection. You can type your question instead.');
      } else if (e.error !== 'aborted') {
        setProblem('Speech did not work this time. You can type your question instead.');
      }
    };
    rec.onend = () => {
      recRef.current = null;
      setListening(false);
    };

    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch {
      setProblem('Speech did not work this time. You can type your question instead.');
    }
  }, []);

  const toggle = useCallback(() => (recRef.current ? stop() : start()), [start, stop]);

  // Stop listening if the chat closes.
  useEffect(() => () => recRef.current?.abort(), []);

  // Hide the hint after a few seconds.
  useEffect(() => {
    if (!problem) return;
    const t = window.setTimeout(() => setProblem(null), 5000);
    return () => window.clearTimeout(t);
  }, [problem]);

  return { supported, listening, problem, toggle, stop };
}
