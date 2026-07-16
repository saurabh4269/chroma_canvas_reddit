/**
 * Tiny synthesized SFX kit — WebAudio oscillators/noise only, zero assets.
 * The AudioContext is created lazily on the first play() (post-gesture),
 * satisfying browser autoplay policies inside the Reddit webview.
 */

type SfxName = 'jump' | 'land' | 'death' | 'win' | 'click' | 'sparkle';

class Sfx {
  private ctx: AudioContext | null = null;
  private muted = false;

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(next: boolean): void {
    this.muted = next;
  }

  toggle(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  play(name: SfxName): void {
    if (this.muted) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();

    switch (name) {
      case 'jump':
        this.blip(ctx, 240, 480, 0.09, 'square', 0.05);
        break;
      case 'land':
        this.thud(ctx);
        break;
      case 'death':
        this.sweep(ctx, 320, 70, 0.4, 'sawtooth', 0.07);
        this.noiseBurst(ctx, 0.14, 0.05);
        break;
      case 'win':
        this.arpeggio(ctx, [523.25, 659.25, 783.99, 1046.5], 0.1, 0.06);
        break;
      case 'click':
        this.blip(ctx, 900, 1100, 0.035, 'triangle', 0.04);
        break;
      case 'sparkle':
        this.blip(ctx, 1200, 1800, 0.07, 'sine', 0.03);
        break;
    }
  }

  private ensureCtx(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return null;
      this.ctx = new Ctor();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private env(ctx: AudioContext, peak: number, dur: number): GainNode {
    const g = ctx.createGain();
    const t = ctx.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(ctx.destination);
    return g;
  }

  private blip(
    ctx: AudioContext,
    from: number,
    to: number,
    dur: number,
    type: OscillatorType,
    vol: number
  ): void {
    const osc = ctx.createOscillator();
    osc.type = type;
    const t = ctx.currentTime;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    osc.connect(this.env(ctx, vol, dur));
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  private sweep(
    ctx: AudioContext,
    from: number,
    to: number,
    dur: number,
    type: OscillatorType,
    vol: number
  ): void {
    this.blip(ctx, from, to, dur, type, vol);
  }

  private arpeggio(
    ctx: AudioContext,
    freqs: number[],
    step: number,
    vol: number
  ): void {
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      const t = ctx.currentTime + i * step;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + step * 2.4);
      g.connect(ctx.destination);
      osc.frequency.setValueAtTime(f, t);
      osc.connect(g);
      osc.start(t);
      osc.stop(t + step * 2.6);
    });
  }

  private noiseBurst(ctx: AudioContext, dur: number, vol: number): void {
    const frames = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    src.connect(filter);
    filter.connect(this.env(ctx, vol, dur));
    src.start();
  }

  private thud(ctx: AudioContext): void {
    this.noiseBurst(ctx, 0.07, 0.035);
    this.blip(ctx, 140, 70, 0.07, 'sine', 0.05);
  }
}

export const sfx = new Sfx();
