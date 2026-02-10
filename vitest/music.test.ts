import { describe, expect, it } from "vitest";
import { getScaleById, SCALES } from "../src/music/scales";
import { quantizeMidiToScale } from "../src/music/quantize";
import {
  freqToMidi,
  midiToFreq,
  midiToNoteName,
  noteNameToMidi,
  noteNameToPitchClass,
  pitchClassToNoteName,
  snapMidiToPitchClass,
} from "../src/music/notes";

describe("music scales", () => {
  it("falls back to default scale", () => {
    expect(getScaleById("not-existing-scale").id).toBe("minor-pentatonic");
  });

  it("keeps normalized pitch-class intervals", () => {
    const normalized = SCALES.every((scale) =>
      scale.intervals.every(
        (value, i, arr) =>
          Number.isInteger(value) && value >= 0 && value <= 11 && (i === 0 || arr[i - 1] < value)
      )
    );
    expect(normalized).toBe(true);
  });
});

describe("quantize", () => {
  it("respects nearest/down/up and no repeat", () => {
    const minorPent = getScaleById("minor-pentatonic");

    expect(quantizeMidiToScale(61, { rootMidi: 60, scale: minorPent, mode: "nearest" })).toBe(60);
    expect(quantizeMidiToScale(61, { rootMidi: 60, scale: minorPent, mode: "down" })).toBe(60);
    expect(quantizeMidiToScale(61, { rootMidi: 60, scale: minorPent, mode: "up" })).toBe(63);
    expect(
      quantizeMidiToScale(61, {
        rootMidi: 60,
        scale: minorPent,
        mode: "nearest",
        noImmediateRepeat: true,
        lastMidi: 60,
      })
    ).toBe(63);
  });

  it("supports noThirds and leading-tone penalty", () => {
    const dorian = getScaleById("dorian");
    const harmonicMinor = getScaleById("harmonic-minor");

    expect(quantizeMidiToScale(64, { rootMidi: 60, scale: dorian, mode: "nearest", noThirds: true })).toBe(65);
    expect(quantizeMidiToScale(64, { rootMidi: 60, scale: dorian, mode: "nearest" })).toBe(63);

    expect(
      quantizeMidiToScale(59.5, {
        rootMidi: 60,
        scale: harmonicMinor,
        mode: "nearest",
        avoidLeadingTone: true,
      })
    ).toBe(60);
    expect(
      quantizeMidiToScale(59.5, {
        rootMidi: 60,
        scale: harmonicMinor,
        mode: "nearest",
        avoidLeadingTone: false,
      })
    ).toBe(59);
  });

  it("falls back to root for non-finite input", () => {
    const chromatic = getScaleById("chromatic");
    expect(quantizeMidiToScale(Number.NaN, { rootMidi: 64, scale: chromatic, mode: "nearest" })).toBe(64);
  });
});

describe("notes helpers", () => {
  it("maps pitch classes and note names", () => {
    expect(pitchClassToNoteName(-1)).toBe("B");
    expect(noteNameToPitchClass("F#")).toBe(6);
    expect(noteNameToMidi("C", 4)).toBe(60);
    expect(midiToNoteName(61)).toBe("C#");
  });

  it("converts midi and frequency safely", () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 8);
    expect(freqToMidi(440)).toBeCloseTo(69, 8);
    expect(midiToFreq(Number.NaN)).toBeCloseTo(440, 8);
    expect(freqToMidi(-100)).toBeCloseTo(69, 8);
    expect(freqToMidi(midiToFreq(57.3))).toBeCloseTo(57.3, 8);
  });

  it("snaps midi to target pitch class", () => {
    expect(snapMidiToPitchClass(60.2, 1)).toBe(61);
    expect(snapMidiToPitchClass(Number.NaN, 9)).toBe(69);
  });
});
