export type VoicePriority = 1 | 2 | 3;

interface PendingUtterance {
  text: string;
  priority: VoicePriority;
}

const MAX_QUEUE = 6;

/**
 * Spoken + haptic feedback so a user mid-rep never has to look at the phone.
 * The browser speech engine is queued with priorities: urgent milestones
 * (GO, 3-2-1) can interrupt the form tips, and identical messages are
 * debounced so a persisting form issue isn't shouted every frame.
 */
export class ChallengeAudioService {
  private readonly synthesis: SpeechSynthesis | null;
  private lastUtteranceAt = 0;
  private lastText = "";
  private queue: PendingUtterance[] = [];
  private isMuted: boolean = false;

  constructor() {
    this.synthesis = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  }

  supported(): boolean {
    return this.synthesis !== null;
  }

  isVoiceEnabled(): boolean {
    return !this.isMuted;
  }

  setVoiceEnabled(enabled: boolean): void {
    this.isMuted = !enabled;
    if (this.isMuted) {
      this.clearQueue();
    }
  }

  vibrate(pattern: number | number[]): void {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        /* not supported */
      }
    }
  }

  speak(text: string, priority: VoicePriority = 1, minIntervalMs = 600): void {
    if (!this.synthesis || this.isMuted) return;
    const now = Date.now();
    if (this.lastText === text && now - this.lastUtteranceAt < 1500) return;
    if (now - this.lastUtteranceAt < minIntervalMs && priority < 2) return;

    const speakingNow = this.synthesis.speaking;
    const current = (this.synthesis as SpeechSynthesis & { _currentPriority?: VoicePriority })._currentPriority ?? 1;
    if (speakingNow && priority > current) {
      this.synthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    this.synthesis.speak(utterance);
    (this.synthesis as SpeechSynthesis & { _currentPriority?: VoicePriority })._currentPriority = priority;

    if (this.queue.length >= MAX_QUEUE) {
      this.queue.splice(0, this.queue.length - MAX_QUEUE + 1);
    }
    this.queue.push({ text, priority });
    this.lastText = text;
    this.lastUtteranceAt = now;
    this.vibrate(priority >= 3 ? 200 : 60);
  }

  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.audioCtx || this.audioCtx.state === "closed") {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === "suspended") {
      void this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  playTone(freq = 580, durationMs = 180, type: OscillatorType = "sine"): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + durationMs / 1000);
    } catch {
      /* ignore audio context errors */
    }
  }

  playVictory(): void {
    try {
      const ctx = this.getAudioContext();
      if (!ctx) return;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = freq;
        const startTime = ctx.currentTime + idx * 0.12;
        gain.gain.setValueAtTime(0.2, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.35);
      });
    } catch {
      /* ignore audio context errors */
    }
  }

  clearQueue(): void {
    this.synthesis?.cancel();
    this.queue = [];
  }
}