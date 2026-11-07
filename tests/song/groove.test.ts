import { afterAll, describe, expect, it } from 'vitest';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import study from '../../studies/stand-by-me-segunda-parte.json';
import { chartFromGroove, type GrooveStudy } from '@/song/groove';
import { chartFromMidi } from '@/midi/chart';
import { parseMidi } from '@/midi/smf';
import { loadSongFromZip } from '@/song/package';
import { decodeWav } from '@/audio/wav';
import { findPreset } from '@/midi/gm';

const temp = await mkdtemp(path.join(tmpdir(), 'dk-groove-'));
afterAll(() => rm(temp, { recursive: true, force: true }));

describe('approved Stand By Me second part', () => {
  it('generates a ZIP accepted by the actual importer, with every approved hit in order', async () => {
    const output = path.join(temp, 'study');
    await promisify(execFile)(process.execPath, [
      'scripts/make-groove-song.mjs', 'studies/stand-by-me-segunda-parte.json', output,
    ]);
    const zip = await readFile(`${output}.zip`);
    const pkg = await loadSongFromZip(zip);
    const midi = parseMidi(await pkg.files.get('expert.mid')!.arrayBuffer());
    const chart = chartFromMidi(midi, { fallbackBpm: 122 });
    const events = midi.tracks.flatMap((t) => t.events);
    expect(events.filter((e) => e.type === 'noteOn').every((e) => e.channel === 9)).toBe(true);
    expect(chart.tempoMap[0].bpm).toBeCloseTo(122, 3);
    expect(chart.timeSignatures).toEqual([{ tick: 0, numerator: 4, denominator: 4 }]);

    // Independent sixteenth-note positions from the approved section notation.
    const eighths = [0, 2, 4, 6, 8, 10, 12, 14];
    const patterns: Record<number, Record<string, number[]>> = {
      2: { hihatClosed: eighths, snare: [4, 12], kick: [0, 6] },
      3: { hihatClosed: eighths, snare: [4, 12], kick: [0, 6, 8] },
      4: { hihatClosed: [0, 2, 4, 6, 8, 10], snare: [4, 12, 14, 15], kick: [0, 6] },
      5: { hihatOpen: eighths, snare: [4, 12], kick: [0, 8] },
      6: { hihatOpen: [0, 2, 4, 6, 8, 10, 12], snare: [2, 4, 8, 12, 14, 15], kick: [0, 6, 10] },
      7: { ride: eighths, snare: [4, 12], kick: [0, 6, 8] },
      8: { ride: [0, 2, 4, 6, 8, 10, 12], snare: [2, 4, 8, 12, 14, 15], kick: [0, 6, 10] },
    };
    const playedSections = [2, 3, 2, 2, 2, 2, 2, 4, 2, 3, 2, 2, 2, 2, 5, 6, 7, 7, 7, 7, 7, 7, 7, 7, 8];
    const expected = playedSections.flatMap((section, bar) => Object.entries(patterns[section])
      .flatMap(([voice, steps]) => steps.map((step) => `${(bar * 16 + step) * 120}:${voice}`))).sort();
    expect(chart.notes.map((n) => `${n.tick}:${n.voice}`).sort()).toEqual(expected);
    expect(chart.notes).toHaveLength(318);
    expect(chart.notes.at(-1)!.time).toBeCloseTo(49.057377, 4);

    const audio = decodeWav(await pkg.files.get(pkg.meta.audio)!.arrayBuffer());
    expect(pkg.meta.offset).toBeCloseTo(8 * 60 / 122, 8);
    expect(audio.channels[0].length / audio.sampleRate).toBeCloseTo(27 * 4 * 60 / 122 + 2, 4);
    const firstNoteSample = Math.round(pkg.meta.offset * audio.sampleRate);
    expect(Math.max(...audio.channels[0].slice(firstNoteSample, firstNoteSample + 500))).toBeGreaterThan(0.1);
    const report = JSON.parse(await pkg.files.get('study.json')!.text());
    expect(report.bars).toBe(25);
    expect(report.order.at(-2).repeats).toBe(8);
    expect(report.order.at(-1).repeats).toBe(1);
  });

  it('keeps unsupported musical data from silently changing the part', () => {
    const patches: Partial<GrooveStudy>[] = [
      { swing: 20 }, { timeSig: [3, 4] }, { repeats: [1] },
      { repeats: Array(11).fill(1.5) }, { voices: { hh: [1] } },
      { voices: { unknown: Array(176).fill(1) } },
      { voices: { sn: Array(176).fill(3) } },
    ];
    for (const patch of patches) expect(() => chartFromGroove({ ...study.groove, ...patch })).toThrow();
  });

  it('uses the existing GM device mapping for the Aroma without changing hardware', () => {
    const preset = findPreset('TDX-DRUM');
    expect(preset.id).toBe('gm');
    for (const [voice, note] of [['kick', 36], ['snare', 38], ['hihatClosed', 42], ['hihatOpen', 46], ['ride', 51]] as const) {
      expect(preset.bindings[voice].some((b) => b.note === note)).toBe(true);
    }
  });
});
