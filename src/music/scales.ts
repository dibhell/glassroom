export type ScaleId = string;

export interface ScaleDef {
  id: ScaleId;
  label: string;
  intervals: number[];
  tags?: string[];
  avoid?: {
    leadingTone?: boolean;
  };
}

const normalizeIntervals = (intervals: number[]) => {
  const cleaned = intervals.map((i) => ((i % 12) + 12) % 12);
  const unique = Array.from(new Set(cleaned));
  unique.sort((a, b) => a - b);
  return unique;
};

const defineScale = (scale: ScaleDef): ScaleDef => ({
  ...scale,
  intervals: normalizeIntervals(scale.intervals),
});

export const SCALES: ScaleDef[] = [
  defineScale({
    id: 'ionian',
    label: 'Ionian (Major)',
    intervals: [0, 2, 4, 5, 7, 9, 11],
    tags: ['classic', 'major'],
    avoid: { leadingTone: true },
  }),
  defineScale({
    id: 'aeolian',
    label: 'Aeolian (Natural Minor)',
    intervals: [0, 2, 3, 5, 7, 8, 10],
    tags: ['classic', 'minor'],
  }),
  defineScale({
    id: 'dorian',
    label: 'Dorian',
    intervals: [0, 2, 3, 5, 7, 9, 10],
    tags: ['classic', 'ambient', 'minor'],
  }),
  defineScale({
    id: 'mixolydian',
    label: 'Mixolydian',
    intervals: [0, 2, 4, 5, 7, 9, 10],
    tags: ['classic', 'ambient', 'major'],
  }),
  defineScale({
    id: 'phrygian',
    label: 'Phrygian',
    intervals: [0, 1, 3, 5, 7, 8, 10],
    tags: ['classic', 'dark', 'minor'],
  }),
  defineScale({
    id: 'minor-pentatonic',
    label: 'Minor Pentatonic',
    intervals: [0, 3, 5, 7, 10],
    tags: ['pentatonic', 'ambient', 'minor'],
  }),
  defineScale({
    id: 'major-pentatonic',
    label: 'Major Pentatonic',
    intervals: [0, 2, 4, 7, 9],
    tags: ['pentatonic', 'ambient', 'major'],
  }),
  defineScale({
    id: 'quartal',
    label: 'Quartal (4ths)',
    intervals: [0, 5, 7, 10],
    tags: ['ambient', 'no3rd', 'ambiguous'],
  }),
  defineScale({
    id: 'sus-hybrid',
    label: 'Sus2/Sus4 Hybrid',
    intervals: [0, 2, 5, 7, 9],
    tags: ['ambient', 'no3rd', 'ambiguous'],
  }),
  defineScale({
    id: 'harmonic-minor',
    label: 'Harmonic Minor',
    intervals: [0, 2, 3, 5, 7, 8, 11],
    tags: ['mystic', 'minor'],
  }),
  defineScale({
    id: 'melodic-minor',
    label: 'Melodic Minor (Asc)',
    intervals: [0, 2, 3, 5, 7, 9, 11],
    tags: ['mystic', 'minor'],
  }),
  defineScale({
    id: 'whole-tone',
    label: 'Whole Tone',
    intervals: [0, 2, 4, 6, 8, 10],
    tags: ['mystic', 'ambient', 'symmetric'],
  }),
  defineScale({
    id: 'chromatic',
    label: 'Chromatic (Debug)',
    intervals: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    tags: ['debug'],
  }),
  defineScale({
    id: 'drone-1-3',
    label: 'Drone (1-3 Notes)',
    intervals: [0, 2, 5, 7, 9, 10],
    tags: ['ambient', 'drone', 'no3rd'],
  }),
];

export const DEFAULT_SCALE_ID: ScaleId = 'minor-pentatonic';

export const getScaleById = (id?: ScaleId): ScaleDef => {
  if (id) {
    const found = SCALES.find((scale) => scale.id === id);
    if (found) return found;
  }
  const fallback = SCALES.find((scale) => scale.id === DEFAULT_SCALE_ID);
  return fallback ?? SCALES[0];
};
