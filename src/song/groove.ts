import type { Chart, ChartNote, DrumVoice } from '@/types';
import { constantTempoMap, DEFAULT_PPQ, sortChartNotes } from '@/midi/chart';

/** Straight 4/4 Groove grid. Repeats refer to editor blocks, not played bars. */
export interface GrooveStudy {
  title: string;
  tempo: number;
  timeSig: number[];
  division: number;
  measures: number;
  swing: number;
  voices: Record<string, number[]>;
  repeats?: number[];
}

const VOICES: Record<string, DrumVoice> = {
  hh: 'hihatClosed', sn: 'snare', kk: 'kick', ride: 'ride',
  crash: 'crash', t1: 'tomHigh', t2: 'tomMid', t3: 'tomLow',
};

/** Convert the approved straight grid without deriving or thinning any notes.
 * Unsupported meters, swing and articulations fail explicitly rather than changing the part.
 */
export function chartFromGroove(g: GrooveStudy): { chart: Chart; bars: number; seconds: number } {
  if (!Number.isFinite(g.tempo) || g.tempo < 20 || g.tempo > 400) throw new Error('Tempo must be 20..400 BPM');
  if (g.timeSig?.length !== 2 || g.timeSig[0] !== 4 || g.timeSig[1] !== 4 || g.swing !== 0) {
    throw new Error('Only straight 4/4 studies are supported');
  }
  if (![4, 8, 16, 32].includes(g.division)) throw new Error('Unsupported division');
  if (!Number.isInteger(g.measures) || g.measures < 1 || g.measures > 256) throw new Error('Invalid editor block count');
  if (!g.voices || typeof g.voices !== 'object') throw new Error('Missing voices');
  const repeats = g.repeats ?? Array(g.measures).fill(1);
  if (repeats.length !== g.measures || repeats.some((n) => !Number.isInteger(n) || n < 1 || n > 64)) {
    throw new Error('Each block needs an integer repeat count in 1..64');
  }
  const cells = g.measures * g.division;
  for (const [voice, values] of Object.entries(g.voices)) {
    if (!Object.hasOwn(VOICES, voice)) throw new Error(`Unsupported voice: ${voice}`);
    if (!Array.isArray(values) || values.length !== cells) throw new Error(`Wrong grid length: ${voice}`);
    for (const value of values) {
      if (!Number.isInteger(value) || value < 0 || value > (voice === 'hh' ? 2 : 1)) {
        throw new Error(`Unsupported articulation: ${voice}=${value}`);
      }
    }
  }
  const bars = repeats.reduce((a, b) => a + b, 0);
  if (bars > 1024) throw new Error('Study exceeds 1024 played bars');
  const seconds = bars * 4 * 60 / g.tempo;
  const notes: ChartNote[] = [];
  let playedBar = 0;
  for (let block = 0; block < g.measures; block++) {
    for (let repeat = 0; repeat < repeats[block]; repeat++, playedBar++) {
      for (let step = 0; step < g.division; step++) {
        const tick = (playedBar * 4 + step * 4 / g.division) * DEFAULT_PPQ;
        for (const [voice, values] of Object.entries(g.voices)) {
          const state = values[block * g.division + step];
          if (!state) continue;
          notes.push({ tick, time: tick * 60 / (g.tempo * DEFAULT_PPQ),
            voice: voice === 'hh' && state === 2 ? 'hihatOpen' : VOICES[voice], velocity: 0.8 });
        }
      }
    }
  }
  if (!notes.length) throw new Error('Study has no drum notes');
  return { bars, seconds, chart: {
    ppq: DEFAULT_PPQ, tempoMap: constantTempoMap(g.tempo),
    timeSignatures: [{ tick: 0, numerator: 4, denominator: 4 }],
    notes: sortChartNotes(notes), duration: seconds + 2,
  } };
}
