import { useCallback, useEffect, useState } from "react";

// Synthesized, not sampled -- a couple of oscillator tones -- so there's no audio asset to fetch,
// license or fail to load. Browsers only allow audio after a user gesture; the mute toggle button
// doubles as that gesture, and any click already on the page (Bid, Start auction, etc.) unlocks it
// too, so playback normally "just works" without a dedicated permission step.
let ctx = null;
function getContext() {
  if (typeof window === "undefined") return null;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  if (!ctx) ctx = new AudioCtx();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function tone(frequency, startOffset, duration, gainPeak = 0.18) {
  const audio = getContext();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.value = frequency;
  const start = audio.currentTime + startOffset;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(gainPeak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(audio.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playBidSound() {
  tone(880, 0, 0.12);
}

export function playSoldSound() {
  // A quick rising three-note flourish -- the closest a couple of sine waves get to "cha-ching".
  tone(523.25, 0, 0.16); // C5
  tone(659.25, 0.1, 0.16); // E5
  tone(783.99, 0.2, 0.3); // G5
}

const STORAGE_KEY = "auctionhub-sound-enabled";

export function useSoundEnabled() {
  const [enabled, setEnabled] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) !== "off";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off");
    } catch {
      // Ignore -- preference just won't persist across sessions.
    }
  }, [enabled]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      if (next) getContext(); // the click itself is the unlocking user gesture
      return next;
    });
  }, []);

  return [enabled, toggle];
}
