// Local synthesized sound: no remote audio tracking, downloads, or autoplay.
export class StoreAudio {
  context: AudioContext | null = null;
  master: GainNode | null = null;
  music: OscillatorNode[] = [];
  lastStep = 0;
  async enable() {
    this.context ||= new AudioContext();
    this.master ||= this.context.createGain();
    this.master.gain.value = 0.16;
    this.master.connect(this.context.destination);
    await this.context.resume();
  }
  step(speed: number) {
    if (
      !this.context ||
      this.context.state !== "running" ||
      speed < 0.2 ||
      performance.now() - this.lastStep < (speed > 2.5 ? 250 : 390)
    )
      return;
    this.lastStep = performance.now();
    this.tone(105 + Math.random() * 20, 0.065, 0.17, "triangle");
  }
  tone(
    frequency: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
  ) {
    if (!this.context || !this.master || this.context.state !== "running")
      return;
    const oscillator = this.context.createOscillator(),
      gain = this.context.createGain(),
      now = this.context.currentTime;
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start();
    oscillator.stop(now + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
  }
  setMusic(on: boolean) {
    this.music.forEach((o) => {
      o.stop();
      o.disconnect();
    });
    this.music = [];
    if (!on || !this.context || !this.master) return;
    for (const f of [130.81, 164.81, 196]) {
      const o = this.context.createOscillator(),
        gain = this.context.createGain();
      o.frequency.value = f;
      gain.gain.value = 0.018;
      o.connect(gain);
      gain.connect(this.master);
      o.onended = () => gain.disconnect();
      o.start();
      this.music.push(o);
    }
  }
  suspend() {
    void this.context?.suspend();
  }
  resume() {
    void this.context?.resume();
  }
  dispose() {
    this.setMusic(false);
    void this.context?.close();
    this.context = null;
  }
}
