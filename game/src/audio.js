// Sound: procedural WebAudio only — an engine hum tied to throttle and a ring chime.
// One clear job: make noise. No audio files, no network, silent until the player interacts.
export function createAudio() {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(filter);
      filter.connect(engineGain);
      engineGain.connect(ctx.destination);
      engineOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  return {
    unlock() {
      if (ensure() && ctx.state === 'suspended') ctx.resume();
    },
    setEngine(throttle, speed) {
      if (!ctx || muted) return;
      const t = ctx.currentTime;
      engineOsc.frequency.setTargetAtTime(48 + throttle * 70 + speed * 0.35, t, 0.1);
      engineGain.gain.setTargetAtTime(0.015 + throttle * 0.05, t, 0.1);
    },
    ring() {
      if (!ensure() || muted) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1318, t + 0.09);
      gain.gain.setValueAtTime(0.12, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    },
    thud() {
      if (!ensure() || muted) return;
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.exponentialRampToValueAtTime(35, t + 0.3);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.4);
    },
    toggleMute() {
      muted = !muted;
      if (engineGain) engineGain.gain.value = 0;
      return muted;
    },
  };
}
