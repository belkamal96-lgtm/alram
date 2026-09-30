import { BuiltInSoundId } from '../types/alarm';
import { getCustomSoundById } from './indexedDB';

let audioCtx: AudioContext | null = null;
let currentCustomAudio: HTMLAudioElement | null = null;
let activeLoopInterval: number | null = null;
let activeOscillators: OscillatorNode[] = [];
let masterGain: GainNode | null = null;
let isPlayingRingtone = false;

function getAudioContext(): AudioContext {
  if (!audioCtx || audioCtx.state === 'closed') {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function stopAllAlarmSounds() {
  isPlayingRingtone = false;

  if (activeLoopInterval !== null) {
    window.clearInterval(activeLoopInterval);
    activeLoopInterval = null;
  }

  activeOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // Ignore if already stopped
    }
  });
  activeOscillators = [];

  if (masterGain) {
    try {
      masterGain.disconnect();
    } catch {
      // Ignore
    }
    masterGain = null;
  }

  if (currentCustomAudio) {
    try {
      currentCustomAudio.pause();
      currentCustomAudio.currentTime = 0;
    } catch {
      // Ignore
    }
    currentCustomAudio = null;
  }
}

/**
 * Plays a single motif/phrase of a built-in synthesized alarm tone.
 */
function playSynthMotif(
  soundId: BuiltInSoundId,
  targetVolume: number = 0.8
) {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const phraseGain = ctx.createGain();
  phraseGain.gain.setValueAtTime(targetVolume, now);
  phraseGain.connect(ctx.destination);

  switch (soundId) {
    case 'nepali_flute': {
      // Bansuri (Himalayan Flute) Morning Raga (Bhoopali pentatonic: Sa, Re, Ga, Pa, Dha - e.g. C, D, E, G, A)
      const notes = [
        { freq: 523.25, time: 0.0, dur: 0.35 }, // C5
        { freq: 587.33, time: 0.35, dur: 0.35 }, // D5
        { freq: 659.25, time: 0.70, dur: 0.50 }, // E5
        { freq: 783.99, time: 1.20, dur: 0.60 }, // G5
        { freq: 880.00, time: 1.80, dur: 0.70 }, // A5
        { freq: 783.99, time: 2.50, dur: 0.40 }, // G5
        { freq: 659.25, time: 2.90, dur: 0.60 }, // E5
        { freq: 523.25, time: 3.50, dur: 0.90 }, // C5
      ];

      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const start = now + n.time;
        const end = start + n.dur;

        osc.type = 'triangle'; // Warm breathy flute
        osc.frequency.setValueAtTime(n.freq, start);

        // Flute gentle vibrato (LFO)
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.frequency.setValueAtTime(5, start); // 5Hz vibrato
        lfoGain.gain.setValueAtTime(4.5, start);
        lfo.connect(osc.frequency);
        lfo.start(start);
        lfo.stop(end);

        // Soft flute envelope (breath attack & release)
        noteGain.gain.setValueAtTime(0.001, start);
        noteGain.gain.exponentialRampToValueAtTime(0.4, start + 0.08);
        noteGain.gain.exponentialRampToValueAtTime(0.001, end);

        osc.connect(noteGain);
        noteGain.connect(phraseGain);

        osc.start(start);
        osc.stop(end);
        activeOscillators.push(osc);
      });
      break;
    }

    case 'twin_bell': {
      // Classic mechanical twin-bell alarm clock
      const bellFrequencies = [820, 940];
      const bursts = 14;
      for (let i = 0; i < bursts; i++) {
        const t = now + i * 0.12;
        const freq = bellFrequencies[i % 2];
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t);

        g.gain.setValueAtTime(0.4, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + 0.1);

        osc.connect(g);
        g.connect(phraseGain);

        osc.start(t);
        osc.stop(t + 0.11);
        activeOscillators.push(osc);
      }
      break;
    }

    case 'digital_chirp': {
      // Modern digital watch/alarm triple beep
      const beeps = [0, 0.15, 0.3, 0.45];
      beeps.forEach((tOffset) => {
        const t = now + tOffset;
        const osc = ctx.createOscillator();
        const g = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(2048, t);
        osc.frequency.setValueAtTime(2400, t + 0.04);

        g.gain.setValueAtTime(0.5, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(g);
        g.connect(phraseGain);

        osc.start(t);
        osc.stop(t + 0.1);
        activeOscillators.push(osc);
      });
      break;
    }

    case 'temple_singing_bowl': {
      // Tibetan singing bowl & Himalayan prayer bell
      const baseFreq = 216; // Fundamental
      const harmonics = [1, 2.76, 5.4, 8.1];

      harmonics.forEach((h, idx) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(baseFreq * h, now);

        const amp = 0.4 / (idx + 1);
        g.gain.setValueAtTime(amp, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 3.8);

        osc.connect(g);
        g.connect(phraseGain);

        osc.start(now);
        osc.stop(now + 4.0);
        activeOscillators.push(osc);
      });
      break;
    }

    case 'rooster_morning': {
      // Energetic melodic wake-up fanfare
      const notes = [
        { f: 440, t: 0, d: 0.15 },
        { f: 554.37, t: 0.16, d: 0.15 },
        { f: 659.25, t: 0.32, d: 0.18 },
        { f: 880, t: 0.52, d: 0.75 },
      ];
      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.f, now + n.t);

        g.gain.setValueAtTime(0.35, now + n.t);
        g.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);

        osc.connect(g);
        g.connect(phraseGain);

        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
        activeOscillators.push(osc);
      });
      break;
    }

    case 'sunrise_siren': {
      // Sweeping urgent alarm
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sawtooth';

      osc.frequency.setValueAtTime(400, now);
      osc.frequency.linearRampToValueAtTime(900, now + 0.4);
      osc.frequency.linearRampToValueAtTime(400, now + 0.8);
      osc.frequency.linearRampToValueAtTime(900, now + 1.2);
      osc.frequency.linearRampToValueAtTime(400, now + 1.6);

      g.gain.setValueAtTime(0.4, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      osc.connect(g);
      g.connect(phraseGain);

      osc.start(now);
      osc.stop(now + 1.8);
      activeOscillators.push(osc);
      break;
    }
  }
}

/**
 * Loops the alarm sound continuously until stopAllAlarmSounds() is called.
 * Supports gradual volume fade-in and custom uploaded audio.
 */
export async function startAlarmRinging(
  soundId: string,
  targetVolumePercent: number = 100,
  gradualVolume: boolean = false
) {
  stopAllAlarmSounds();
  isPlayingRingtone = true;

  const targetVol = Math.max(0.05, Math.min(1.0, targetVolumePercent / 100));
  let currentVol = gradualVolume ? 0.1 : targetVol;

  // Check if it's a custom sound stored in IndexedDB
  if (!isBuiltIn(soundId)) {
    try {
      const record = await getCustomSoundById(soundId);
      if (record && record.audioBlob) {
        const audioUrl = URL.createObjectURL(record.audioBlob);
        const audio = new Audio(audioUrl);
        audio.loop = true;
        audio.volume = currentVol;
        currentCustomAudio = audio;

        await audio.play();

        if (gradualVolume) {
          const fadeInterval = window.setInterval(() => {
            if (!isPlayingRingtone || !currentCustomAudio) {
              window.clearInterval(fadeInterval);
              return;
            }
            if (currentVol < targetVol) {
              currentVol = Math.min(targetVol, currentVol + 0.05);
              currentCustomAudio.volume = currentVol;
            } else {
              window.clearInterval(fadeInterval);
            }
          }, 1500);
        }
        return;
      }
    } catch (e) {
      console.warn('Failed to play custom sound, falling back to nepali_flute:', e);
    }
  }

  // Built-in synth looping
  const builtInId = (isBuiltIn(soundId) ? soundId : 'nepali_flute') as BuiltInSoundId;
  const loopIntervalMs = getLoopIntervalForSound(builtInId);

  playSynthMotif(builtInId, currentVol);

  const startTime = Date.now();
  activeLoopInterval = window.setInterval(() => {
    if (!isPlayingRingtone) return;

    if (gradualVolume && currentVol < targetVol) {
      const elapsedSec = (Date.now() - startTime) / 1000;
      currentVol = Math.min(targetVol, 0.1 + (elapsedSec / 30) * targetVol);
    }

    playSynthMotif(builtInId, currentVol);
  }, loopIntervalMs);
}

/**
 * Previews a sound for ~4 seconds.
 */
export async function previewSound(soundId: string, volumePercent: number = 80) {
  stopAllAlarmSounds();
  const vol = Math.max(0.05, Math.min(1.0, volumePercent / 100));

  if (!isBuiltIn(soundId)) {
    try {
      const record = await getCustomSoundById(soundId);
      if (record && record.audioBlob) {
        const audioUrl = URL.createObjectURL(record.audioBlob);
        const audio = new Audio(audioUrl);
        audio.volume = vol;
        currentCustomAudio = audio;
        await audio.play();
        setTimeout(() => {
          stopAllAlarmSounds();
        }, 5000);
        return;
      }
    } catch (err) {
      console.warn('Could not preview custom sound:', err);
    }
  }

  const builtInId = (isBuiltIn(soundId) ? soundId : 'nepali_flute') as BuiltInSoundId;
  playSynthMotif(builtInId, vol);
  setTimeout(() => {
    stopAllAlarmSounds();
  }, 4500);
}

function isBuiltIn(id: string): boolean {
  return [
    'nepali_flute',
    'twin_bell',
    'digital_chirp',
    'temple_singing_bowl',
    'rooster_morning',
    'sunrise_siren',
  ].includes(id);
}

function getLoopIntervalForSound(id: BuiltInSoundId): number {
  switch (id) {
    case 'nepali_flute':
      return 4500;
    case 'twin_bell':
      return 2200;
    case 'digital_chirp':
      return 1500;
    case 'temple_singing_bowl':
      return 4800;
    case 'rooster_morning':
      return 2500;
    case 'sunrise_siren':
      return 2200;
    default:
      return 3000;
  }
}
