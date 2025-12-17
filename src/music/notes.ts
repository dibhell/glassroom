export const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export type NoteName = typeof NOTE_NAMES[number];

const mod = (n: number, m: number) => ((n % m) + m) % m;

export const pitchClassToNoteName = (pc: number): NoteName => {
  return NOTE_NAMES[mod(pc, 12)] as NoteName;
};

export const noteNameToPitchClass = (name: NoteName): number => {
  return NOTE_NAMES.indexOf(name);
};

export const noteNameToMidi = (name: NoteName, octave: number = 4): number => {
  const pc = noteNameToPitchClass(name);
  return (octave + 1) * 12 + pc;
};

export const midiToNoteName = (midi: number): NoteName => {
  return pitchClassToNoteName(midi);
};

export const midiToFreq = (midi: number): number => {
  const safeMidi = Number.isFinite(midi) ? midi : 69;
  return 440 * Math.pow(2, (safeMidi - 69) / 12);
};

export const freqToMidi = (freq: number): number => {
  const safeFreq = Number.isFinite(freq) && freq > 0 ? freq : 440;
  return 69 + 12 * Math.log2(safeFreq / 440);
};

export const snapMidiToPitchClass = (midi: number, targetPc: number): number => {
  const safeMidi = Number.isFinite(midi) ? midi : 69;
  const safeTarget = mod(targetPc, 12);
  const currentPc = mod(Math.round(safeMidi), 12);
  if (currentPc === safeTarget) return Math.round(safeMidi);

  const down = Math.round(safeMidi) - mod(currentPc - safeTarget, 12);
  const up = Math.round(safeMidi) + mod(safeTarget - currentPc, 12);
  return Math.abs(safeMidi - down) <= Math.abs(safeMidi - up) ? down : up;
};
