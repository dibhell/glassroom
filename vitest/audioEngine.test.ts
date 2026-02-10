import { beforeEach, describe, expect, it, vi } from "vitest";
import { audioService } from "../services/audioEngine";
import { getScaleById } from "../src/music/scales";
import { SoundType } from "../types";

type AnyEngine = Record<string, any>;

const engine = audioService as unknown as AnyEngine;

const sourceLabel = (source: any): string => {
  if (!source) return "NONE";
  if (source.type === "synth") return "SYNTH";
  return `${source.type}-${source.index ?? "x"}`;
};

beforeEach(() => {
  audioService.clearAllSamples();
  audioService.setSynthEnabled(true);
  engine.playCursor = 0;
});

describe("audio source pool", () => {
  it("uses synth when it is the only source", () => {
    const poolInfo = audioService.getActivePoolInfo();
    expect(poolInfo.size).toBe(3);
    expect(poolInfo.labels.every((label) => label === "SYNTH")).toBe(true);
    expect(sourceLabel(audioService.assignSourceToBubble())).toBe("SYNTH");
  });

  it("returns null when no source is available and synth is disabled", () => {
    audioService.setSynthEnabled(false);
    audioService.clearAllSamples();
    expect(audioService.assignSourceToBubble()).toBeNull();
  });

  it("cycles through mixed sources in round-robin order", () => {
    engine.sampleBank[0] = { duration: 1 } as AudioBuffer;
    engine.micBank[2] = { duration: 1 } as AudioBuffer;
    engine.updatePlayPool();

    const poolSize = audioService.getActivePoolSize();
    expect(poolSize).toBe(3);

    const picks = Array.from({ length: poolSize * 2 }, () => sourceLabel(audioService.assignSourceToBubble()));
    const first = picks.slice(0, poolSize);
    const second = picks.slice(poolSize);

    expect(second).toEqual(first);
    expect(new Set(first)).toEqual(new Set(["SYNTH", "smp-0", "mic-2"]));
  });

  it("supports slot search and slot clear operations", () => {
    expect(engine.findSlot([{}, {}, null, null], 2)).toBe(2);
    expect(engine.findSlot([{}, null, {}, {}], 3)).toBe(1);
    expect(engine.findSlot([{}, {}, {}], 1)).toBe(-1);

    engine.sampleBank[0] = { duration: 1 } as AudioBuffer;
    engine.sampleBank[1] = { duration: 1 } as AudioBuffer;
    engine.micBank[0] = { duration: 1 } as AudioBuffer;
    engine.updatePlayPool();

    audioService.clearSampleSlot(1);
    audioService.clearMicSlot(0);
    const snapshot = audioService.getBankSnapshot();
    expect(snapshot.smp[0]).toBe(true);
    expect(snapshot.smp[1]).toBe(false);
    expect(snapshot.mic[0]).toBe(false);
  });

  it("re-enables synth when switching to SYNTH mode", () => {
    audioService.setSynthEnabled(false);
    audioService.setSoundType(SoundType.SAMPLE);
    expect(audioService.getBankSnapshot().synthEnabled).toBe(false);

    audioService.setSoundType(SoundType.SYNTH);
    expect(audioService.getBankSnapshot().synthEnabled).toBe(true);
  });
});

describe("audio interactions", () => {
  it("clamps wet controls and lofi params", () => {
    const capture = () => vi.fn<(value: number, at: number, tc: number) => void>();
    const reverbSet = capture();
    const drySet = capture();
    const pingSet = capture();
    const fbLSet = capture();
    const fbRSet = capture();
    const delayLSet = capture();
    const delayRSet = capture();
    const stretchSet = capture();
    const mixSet = capture();
    const grainSet = capture();

    engine.ctx = { currentTime: 12.5 };
    engine.reverbGain = { gain: { setTargetAtTime: reverbSet } };
    engine.dryGain = { gain: { setTargetAtTime: drySet } };
    engine.pingPongReturn = { gain: { setTargetAtTime: pingSet } };
    engine.feedbackL = { gain: { setTargetAtTime: fbLSet } };
    engine.feedbackR = { gain: { setTargetAtTime: fbRSet } };
    engine.delayL = { delayTime: { setTargetAtTime: delayLSet } };
    engine.delayR = { delayTime: { setTargetAtTime: delayRSet } };
    engine.lastDelayTimes = null;
    engine.lastAudioSettings = { baseFrequency: 440 };
    engine.lastMusicSettings = {
      root: 0,
      scaleId: "ionian",
      scaleIndex: 0,
      quantizeEnabled: true,
      noImmediateRepeat: false,
      avoidLeadingTone: false,
      noThirds: false,
    };
    engine.granularNode = {
      parameters: new Map([
        ["stretch", { setTargetAtTime: stretchSet }],
        ["mix", { setTargetAtTime: mixSet }],
        ["grainSize", { setTargetAtTime: grainSet }],
      ]),
    };

    const lofiEnabled = vi.fn<(enabled: boolean) => void>();
    const lofiParams = vi.fn<(params: { drive: number; tape: number; crush: number }) => void>();
    engine.masterLofi = {
      setEnabled: lofiEnabled,
      setParams: lofiParams,
      dispose: vi.fn(),
    };

    audioService.setReverbWet(2);
    audioService.setReverbWet(-1);
    audioService.setPingPongWet(2);
    audioService.setPingPongWet(Number.NaN);
    audioService.setLofiEnabled(true);
    audioService.setLofiParams({ drive: 2, tape: -1, crush: 0.4 });
    audioService.setLofiParams({ drive: Number.NaN });

    expect(reverbSet.mock.calls[0][0]).toBeCloseTo(1, 8);
    expect(drySet.mock.calls[0][0]).toBeCloseTo(0.5, 8);
    expect(reverbSet.mock.calls[1][0]).toBeCloseTo(0, 8);
    expect(drySet.mock.calls[1][0]).toBeCloseTo(1, 8);

    expect(pingSet.mock.calls[0][0]).toBeCloseTo(1, 8);
    expect(fbLSet.mock.calls[0][0]).toBeCloseTo(0.9, 8);
    expect(fbRSet.mock.calls[0][0]).toBeCloseTo(0.9, 8);
    expect(pingSet.mock.calls[1][0]).toBeCloseTo(0, 8);
    expect(fbLSet.mock.calls[1][0]).toBeCloseTo(0.2, 8);
    expect(fbRSet.mock.calls[1][0]).toBeCloseTo(0.2, 8);

    expect(lofiEnabled).toHaveBeenCalledWith(true);
    expect(lofiParams).toHaveBeenNthCalledWith(1, { drive: 1, tape: 0, crush: 0.4 });
    expect(lofiParams).toHaveBeenNthCalledWith(2, { drive: 1, tape: 0, crush: 0.4 });
  });

  it("builds constrained intervals for drone scales", () => {
    const nonDrone = getScaleById("ionian");
    expect(engine.getScaleForQuantize(nonDrone)).toBe(nonDrone);

    const drone = getScaleById("drone-1-3");
    engine.droneScaleId = null;
    engine.dronePool = null;
    engine.droneTriggerCount = 0;

    const first = engine.getScaleForQuantize(drone);
    const second = engine.getScaleForQuantize(drone);

    expect(first.intervals.length).toBeGreaterThanOrEqual(1);
    expect(first.intervals.length).toBeLessThanOrEqual(3);
    expect(new Set(first.intervals).size).toBe(first.intervals.length);
    expect(first.intervals[0]).toBe(0);
    expect(second.intervals).toEqual(first.intervals);
    first.intervals.forEach((interval: number) => {
      expect(drone.intervals.includes(interval)).toBe(true);
    });
  });
});
