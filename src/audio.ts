/**
 * Web Audio API synthesizer for ambient shopping beats & interactive sound effects
 */

class SoundController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = true;
  private bgOscillator: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private isPlayingBg: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (!this.isMuted) {
      this.startAmbientBeat();
    } else {
      this.stopAmbientBeat();
    }
    return !this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  // Soft atmospheric electronic loop
  public startAmbientBeat() {
    try {
      this.initContext();
      if (!this.ctx || this.isPlayingBg) return;

      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.setValueAtTime(0.04, this.ctx.currentTime);
      this.gainNode.connect(this.ctx.destination);

      // Warm chord synth
      this.bgOscillator = this.ctx.createOscillator();
      this.bgOscillator.type = 'triangle';
      this.bgOscillator.frequency.setValueAtTime(220, this.ctx.currentTime); // A3
      this.bgOscillator.connect(this.gainNode);
      this.bgOscillator.start();
      this.isPlayingBg = true;
    } catch {
      // Audio autoplay policy handled gracefully
    }
  }

  public stopAmbientBeat() {
    try {
      if (this.bgOscillator) {
        this.bgOscillator.stop();
        this.bgOscillator.disconnect();
        this.bgOscillator = null;
      }
      this.isPlayingBg = false;
    } catch {
      // ignore
    }
  }

  // Play high tech purchase confirmed sound (EVM confirmation chime)
  public playSuccessChime() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
      osc.frequency.setValueAtTime(783.99, now + 0.2); // G5
      osc.frequency.setValueAtTime(1046.5, now + 0.3); // C6

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.7);
    } catch {
      // ignore
    }
  }

  // Like heart pop
  public playLikePop() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // ignore
    }
  }

  // Reel swipe whoosh sound
  public playSwipeWhoosh() {
    try {
      this.initContext();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.15);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.16);
    } catch {
      // ignore
    }
  }
}

export const soundController = new SoundController();
