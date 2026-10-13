// Web Audio API generator for warm, soothing therapeutic chimes without external audio assets

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch (err) {
    console.warn('AudioContext not available:', err);
    return null;
  }
}

/**
 * Play a low, warm, soothing bell chime (432Hz / 528Hz healing resonance)
 */
export function playWarmChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  // 432 Hz fundamental frequency
  osc.type = 'sine';
  osc.frequency.setValueAtTime(432, now);
  // Gentle slide down
  osc.frequency.exponentialRampToValueAtTime(320, now + 0.4);

  // Soft envelope
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.2, now + 0.04);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.65);
}

/**
 * Play a higher resonant chime for the finale of Set 1 (Round 8)
 * Longer sustain, wind-chime harmonics
 */
export function playResonantChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Harmonized dual tones (576 Hz + 864 Hz)
  const freqs = [576, 864];
  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    const volume = idx === 0 ? 0.22 : 0.12;
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 1.25);
  });
}

/**
 * Play gentle celebration harmony when finishing the game
 */
export function playPeacefulHarmony(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const chord = [396, 528, 639]; // Healing solfeggio chord notes

  chord.forEach((freq, index) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + index * 0.1);

    gain.gain.setValueAtTime(0.001, now + index * 0.1);
    gain.gain.linearRampToValueAtTime(0.15, now + index * 0.1 + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.1 + 1.5);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + index * 0.1);
    osc.stop(now + index * 0.1 + 1.6);
  });
}

/**
 * Play paper shredder ASMR sound effect
 * Realistic mechanical motor whir + rhythmic paper slicing & crunching noise
 */
export function playShredderASMR(durationSeconds: number = 3.0): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const sampleRate = ctx.sampleRate;

  // 1. Noise buffer for paper slicing and crunching
  const bufferSize = Math.floor(sampleRate * durationSeconds);
  const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = Math.random() * 2 - 1;
  }

  const noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;

  // Bandpass filter centered around paper ripping & cutting frequencies
  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(1800, now);
  bandpass.Q.setValueAtTime(1.2, now);

  // Chopping amplitude modulation to simulate rotary blades
  const shredGain = ctx.createGain();
  shredGain.gain.setValueAtTime(0.001, now);
  shredGain.gain.linearRampToValueAtTime(0.25, now + 0.1);
  shredGain.gain.setValueAtTime(0.25, now + durationSeconds - 0.3);
  shredGain.gain.linearRampToValueAtTime(0.001, now + durationSeconds);

  // LFO for rhythmic blade cutting
  const lfo = ctx.createOscillator();
  lfo.frequency.setValueAtTime(16, now); // 16 cuts per second
  const lfoGain = ctx.createGain();
  lfoGain.gain.setValueAtTime(0.12, now);
  lfo.connect(lfoGain.gain);

  // 2. Motor hum
  const motorOsc = ctx.createOscillator();
  motorOsc.type = 'sawtooth';
  motorOsc.frequency.setValueAtTime(95, now);
  motorOsc.frequency.linearRampToValueAtTime(105, now + 0.3);
  motorOsc.frequency.setValueAtTime(105, now + durationSeconds - 0.4);
  motorOsc.frequency.exponentialRampToValueAtTime(40, now + durationSeconds); // motor winding down

  const motorFilter = ctx.createBiquadFilter();
  motorFilter.type = 'lowpass';
  motorFilter.frequency.setValueAtTime(280, now);

  const motorGain = ctx.createGain();
  motorGain.gain.setValueAtTime(0.001, now);
  motorGain.gain.linearRampToValueAtTime(0.12, now + 0.1);
  motorGain.gain.setValueAtTime(0.12, now + durationSeconds - 0.3);
  motorGain.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

  // Connections
  noiseSource.connect(bandpass);
  bandpass.connect(shredGain);
  shredGain.connect(ctx.destination);

  motorOsc.connect(motorFilter);
  motorFilter.connect(motorGain);
  motorGain.connect(ctx.destination);

  noiseSource.start(now);
  noiseSource.stop(now + durationSeconds);
  motorOsc.start(now);
  motorOsc.stop(now + durationSeconds);
}

/**
 * Play fire burning & crackling ASMR sound effect
 * Match strike spark -> warm flame roar -> sporadic wood/paper crackle pops -> wind breeze
 */
export function playFireBurnASMR(durationSeconds: number = 3.6): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const sampleRate = ctx.sampleRate;

  // 1. Initial match strike / ignition whoosh
  const strikeNoise = ctx.createBuffer(1, Math.floor(sampleRate * 0.25), sampleRate);
  const strikeData = strikeNoise.getChannelData(0);
  for (let i = 0; i < strikeData.length; i++) {
    strikeData[i] = Math.random() * 2 - 1;
  }
  const strikeSource = ctx.createBufferSource();
  strikeSource.buffer = strikeNoise;

  const strikeFilter = ctx.createBiquadFilter();
  strikeFilter.type = 'bandpass';
  strikeFilter.frequency.setValueAtTime(3200, now);
  strikeFilter.Q.setValueAtTime(2.0, now);

  const strikeGain = ctx.createGain();
  strikeGain.gain.setValueAtTime(0.001, now);
  strikeGain.gain.linearRampToValueAtTime(0.2, now + 0.03);
  strikeGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  strikeSource.connect(strikeFilter);
  strikeFilter.connect(strikeGain);
  strikeGain.connect(ctx.destination);

  strikeSource.start(now);
  strikeSource.stop(now + 0.25);

  // 2. Warm continuous flame rumble (filtered low noise)
  const flameLength = Math.floor(sampleRate * durationSeconds);
  const flameBuffer = ctx.createBuffer(1, flameLength, sampleRate);
  const flameData = flameBuffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < flameLength; i++) {
    // Pink/Brownish noise approximation
    const white = Math.random() * 2 - 1;
    lastOut = (lastOut + 0.05 * white) / 1.05;
    flameData[i] = lastOut * 3.5;
  }
  const flameSource = ctx.createBufferSource();
  flameSource.buffer = flameBuffer;

  const flameFilter = ctx.createBiquadFilter();
  flameFilter.type = 'lowpass';
  flameFilter.frequency.setValueAtTime(500, now);

  const flameGain = ctx.createGain();
  flameGain.gain.setValueAtTime(0.001, now);
  flameGain.gain.linearRampToValueAtTime(0.28, now + 0.4);
  flameGain.gain.setValueAtTime(0.28, now + durationSeconds - 0.8);
  flameGain.gain.exponentialRampToValueAtTime(0.001, now + durationSeconds);

  flameSource.connect(flameFilter);
  flameFilter.connect(flameGain);
  flameGain.connect(ctx.destination);

  flameSource.start(now);
  flameSource.stop(now + durationSeconds);

  // 3. Crackling ember pops (scattered tiny impulsive clicks)
  const popCount = 14;
  for (let p = 0; p < popCount; p++) {
    const popTime = now + 0.3 + Math.random() * (durationSeconds - 1.2);
    const popOsc = ctx.createOscillator();
    const popGain = ctx.createGain();

    popOsc.type = 'square';
    popOsc.frequency.setValueAtTime(1400 + Math.random() * 1600, popTime);

    popGain.gain.setValueAtTime(0.001, popTime);
    popGain.gain.linearRampToValueAtTime(0.12, popTime + 0.005);
    popGain.gain.exponentialRampToValueAtTime(0.0001, popTime + 0.035);

    popOsc.connect(popGain);
    popGain.connect(ctx.destination);

    popOsc.start(popTime);
    popOsc.stop(popTime + 0.04);
  }

  // 4. Wind breeze / ashes blowing away (swirling high-mid bandpass noise towards the end)
  const windStart = now + durationSeconds - 1.4;
  const windDuration = 1.6;
  const windBuffer = ctx.createBuffer(1, Math.floor(sampleRate * windDuration), sampleRate);
  const windData = windBuffer.getChannelData(0);
  for (let i = 0; i < windData.length; i++) {
    windData[i] = Math.random() * 2 - 1;
  }
  const windSource = ctx.createBufferSource();
  windSource.buffer = windBuffer;

  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.setValueAtTime(450, windStart);
  windFilter.frequency.exponentialRampToValueAtTime(950, windStart + 0.8);
  windFilter.frequency.exponentialRampToValueAtTime(350, windStart + windDuration);
  windFilter.Q.setValueAtTime(2.5, windStart);

  const windGain = ctx.createGain();
  windGain.gain.setValueAtTime(0.001, windStart);
  windGain.gain.linearRampToValueAtTime(0.16, windStart + 0.5);
  windGain.gain.exponentialRampToValueAtTime(0.0001, windStart + windDuration);

  windSource.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(ctx.destination);

  windSource.start(windStart);
  windSource.stop(windStart + windDuration);
}
