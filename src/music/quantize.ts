import { getScaleById, ScaleDef } from './scales';

const mod = (n: number, m: number) => ((n % m) + m) % m;

export interface QuantizeConfig {
  rootMidi: number;
  scale: ScaleDef;
  mode?: 'nearest' | 'down' | 'up';
  octaveWrap?: boolean;
  noImmediateRepeat?: boolean;
  lastMidi?: number | null;
  avoidLeadingTone?: boolean;
  noThirds?: boolean;
}

const buildAllowedPitchClasses = (rootMidi: number, scale: ScaleDef, cfg: QuantizeConfig) => {
  const rootPc = mod(rootMidi, 12);
  const scaleIntervals = scale.intervals.slice().sort((a, b) => a - b);
  let filtered = scaleIntervals;

  if (cfg.noThirds || scale.tags?.includes('no3rd')) {
    filtered = filtered.filter((i) => i !== 3 && i !== 4);
  }

  if (filtered.length === 0) filtered = scaleIntervals;
  if (filtered.length === 0) filtered = [0];

  return filtered.map((i) => mod(rootPc + i, 12));
};

const buildCandidates = (inputMidi: number, allowedPitchClasses: number[]) => {
  const candidates = new Set<number>();
  for (const pc of allowedPitchClasses) {
    const base = inputMidi - mod(inputMidi - pc, 12);
    candidates.add(base - 12);
    candidates.add(base);
    candidates.add(base + 12);
  }
  return Array.from(candidates).filter(Number.isFinite);
};

const pickCandidate = (
  inputMidi: number,
  candidates: number[],
  mode: QuantizeConfig['mode'],
  avoidLeadingTone: boolean,
  leadingTonePc: number
) => {
  const sorted = candidates
    .map((midi) => {
      const dist = Math.abs(midi - inputMidi);
      const pc = mod(midi, 12);
      const penalty = avoidLeadingTone && pc === leadingTonePc ? 0.25 : 0;
      return { midi, dist, score: dist + penalty };
    })
    .sort((a, b) => (a.score - b.score) || (a.dist - b.dist) || (a.midi - b.midi));

  if (mode === 'down') {
    const below = sorted.filter((c) => c.midi <= inputMidi);
    if (below.length) return below;
  }

  if (mode === 'up') {
    const above = sorted.filter((c) => c.midi >= inputMidi);
    if (above.length) return above;
  }

  return sorted;
};

export const quantizeMidiToScale = (inputMidi: number, cfg: QuantizeConfig): number => {
  const safeInput = Number.isFinite(inputMidi) ? inputMidi : cfg.rootMidi;
  const allowed = buildAllowedPitchClasses(cfg.rootMidi, cfg.scale, cfg);
  const candidates = buildCandidates(safeInput, allowed);
  const mode = cfg.mode ?? 'nearest';
  const rootPc = mod(cfg.rootMidi, 12);
  const leadingTonePc = mod(rootPc + 11, 12);
  const avoidLeadingTone = Boolean(cfg.avoidLeadingTone || cfg.scale.avoid?.leadingTone);
  const ordered = pickCandidate(safeInput, candidates, mode, avoidLeadingTone, leadingTonePc);

  let chosen = ordered[0]?.midi ?? safeInput;
  if (cfg.noImmediateRepeat && cfg.lastMidi != null) {
    const alt = ordered.find((c) => c.midi !== cfg.lastMidi);
    if (alt) chosen = alt.midi;
  }

  return Math.round(chosen);
};

let didDevCheck = false;

const runDevChecks = () => {
  if (didDevCheck) return;
  didDevCheck = true;

  const minorPent = getScaleById('minor-pentatonic');
  const out1 = quantizeMidiToScale(61, { rootMidi: 60, scale: minorPent, mode: 'nearest' });
  console.assert(out1 === 60 || out1 === 63, 'quantize: C# in C minor pentatonic should snap to C or D#');

  const dorian = getScaleById('dorian');
  const allowed = dorian.intervals.map((i) => (2 + i) % 12);
  const expected = [2, 4, 5, 7, 9, 11, 0];
  console.assert(allowed.join(',') === expected.join(','), 'quantize: D dorian pitch classes mismatch');
};

if (import.meta.env && import.meta.env.DEV) {
  runDevChecks();
}
