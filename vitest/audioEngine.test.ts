import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { audioService } from "../services/audioEngine";
import { getScaleById } from "../src/music/scales";
import type { AudioSettings, MusicSettings } from "../types";
import { SoundType } from "../types";

type AnyEngine = Record<string, any>;

const engine = audioService as unknown as AnyEngine;

const defaultMusicSettings: MusicSettings = {
  root: 0,
  scaleId: "ionian",
  scaleIndex: 0,
  quantizeEnabled: true,
  noImmediateRepeat: false,
  avoidLeadingTone: false,
  noThirds: false,
};

const defaultAudioSettings: AudioSettings = {
  volume: 0.7,
  low: 0,
  mid: 0,
  high: 0,
  reverbWet: 0.3,
  baseFrequency: 440,
  pingPongWet: 0,
  sampleGain: 1,
  compThreshold: -12,
  compRatio: 3,
  compAttack: 0.005,
  compRelease: 0.5,
  makeupGainDb: 8,
  limiterThreshold: -1,
};

const sourceLabel = (source: any): string => {
  if (!source) return "NONE";
  if (source.type === "synth") return "SYNTH";
  return `${source.type}-${source.index ?? "x"}`;
};

function makeFloatAnalyser(values: number[]) {
  return {
    fftSize: values.length,
    getFloatTimeDomainData: vi.fn((buffer: Float32Array) => {
      buffer.set(values);
    }),
  };
}

function makeByteAnalyser(values: number[]) {
  return {
    frequencyBinCount: values.length,
    getByteTimeDomainData: vi.fn((buffer: Uint8Array) => {
      buffer.set(values);
    }),
  };
}

function makeAudioBuffer(duration: number) {
  return { duration } as AudioBuffer;
}

function makeFile(name: string, size: number = 4) {
  return {
    name,
    async arrayBuffer() {
      return new Uint8Array(size).buffer;
    },
  } as File;
}

beforeEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();

  audioService.clearAllSamples();
  audioService.setSynthEnabled(true);

  engine.playCursor = 0;
  engine.ctx = null;
  engine.mainAnalyser = null;
  engine.peakAnalyser = null;
  engine.stereoAnalyserL = null;
  engine.stereoAnalyserR = null;
  engine.stereoBufferL = null;
  engine.stereoBufferR = null;
  engine.micMeter = null;
  engine.micRecordDest = null;
  engine.micStream = null;
  engine.micSource = null;
  engine.micGain = null;
  engine.micComp = null;
  engine.masterGain = null;
  engine.masterLofi = null;
  engine.lowEQ = null;
  engine.midEQ = null;
  engine.highEQ = null;
  engine.reverbGain = null;
  engine.dryGain = null;
  engine.pingPongReturn = null;
  engine.feedbackL = null;
  engine.feedbackR = null;
  engine.delayL = null;
  engine.delayR = null;
  engine.granularNode = null;
  engine.lastDelayTimes = null;
  engine.lastAudioSettings = { ...defaultAudioSettings };
  engine.lastMusicSettings = { ...defaultMusicSettings };
  engine.desiredMasterGain = 0.7;
  engine.desiredMicGain = 2.6;
  engine.lofiParams = { drive: 0, tape: 0, crush: 0 };
  engine.lofiEnabled = false;
  engine.lofiWorkletLoading = null;
  engine.lofiWorkletLoaded = false;
  engine.activeVoices = 0;
  engine.micInsertIndex = 0;
  engine.didInstallLifecycle = false;
  engine.didInstallGestureUnlock = false;
  engine.shouldPlay = false;
  engine.droneScaleId = null;
  engine.dronePool = null;
  engine.droneTriggerCount = 0;
  engine.spatialControl = { pan: 0, depth: 0, width: 0 };
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
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
    engine.sampleBank[0] = makeAudioBuffer(1);
    engine.micBank[2] = makeAudioBuffer(1);
    engine.updatePlayPool();

    const poolSize = audioService.getActivePoolSize();
    expect(poolSize).toBe(3);

    const picks = Array.from({ length: poolSize * 2 }, () => sourceLabel(audioService.assignSourceToBubble()));
    const first = picks.slice(0, poolSize);
    const second = picks.slice(poolSize);

    expect(second).toEqual(first);
    expect(new Set(first)).toEqual(new Set(["SYNTH", "smp-0", "mic-2"]));
  });

  it("formats pool and bank labels for loaded sources", () => {
    engine.sampleBank[0] = makeAudioBuffer(1);
    engine.micBank[1] = makeAudioBuffer(1);
    engine.updatePlayPool();

    const snapshot = audioService.getBankSnapshot();
    expect(snapshot.loadedLabels).toEqual(expect.arrayContaining(["M02", "S01", "SNT"]));
    expect(snapshot.activePoolSize).toBe(3);

    const info = audioService.getActivePoolInfo();
    expect(info.size).toBe(3);
    expect(new Set(info.labels)).toEqual(new Set(["M02", "S01", "SYNTH"]));
  });

  it("reports when the mic bank is full", () => {
    engine.micBank = new Array(6).fill(makeAudioBuffer(1));
    expect(audioService.isMicBankFull()).toBe(true);
  });

  it("supports slot search and slot clear operations", () => {
    expect(engine.findSlot([{}, {}, null, null], 2)).toBe(2);
    expect(engine.findSlot([{}, null, {}, {}], 3)).toBe(1);
    expect(engine.findSlot([{}, {}, {}], 1)).toBe(-1);

    engine.sampleBank[0] = makeAudioBuffer(1);
    engine.sampleBank[1] = makeAudioBuffer(1);
    engine.micBank[0] = makeAudioBuffer(1);
    engine.updatePlayPool();

    audioService.clearSampleSlot(1);
    audioService.clearMicSlot(0);
    const snapshot = audioService.getBankSnapshot();
    expect(snapshot.smp[0]).toBe(true);
    expect(snapshot.smp[1]).toBe(false);
    expect(snapshot.mic[0]).toBe(false);
  });

  it("ignores out-of-range slot clearing requests", () => {
    engine.sampleBank[0] = makeAudioBuffer(1);
    engine.micBank[0] = makeAudioBuffer(1);
    engine.updatePlayPool();

    audioService.clearSampleSlot(-1);
    audioService.clearSampleSlot(99);
    audioService.clearMicSlot(-1);
    audioService.clearMicSlot(99);

    expect(audioService.getBankSnapshot().smp[0]).toBe(true);
    expect(audioService.getBankSnapshot().mic[0]).toBe(true);
  });

  it("clears all loaded samples and resets loaded state", () => {
    engine.sampleBank[0] = makeAudioBuffer(1);
    engine.micBank[0] = makeAudioBuffer(1);
    engine.customBuffer = makeAudioBuffer(1);
    engine.soundType = SoundType.SAMPLE;

    audioService.clearAllSamples();

    expect(audioService.isSampleLoaded()).toBe(false);
    expect(audioService.getBankSnapshot().loadedLabels).toEqual(["SNT"]);
    expect(engine.soundType).toBe(SoundType.SYNTH);
    expect(engine.customBuffer).toBeNull();
  });

  it("re-enables synth when switching to SYNTH mode", () => {
    audioService.setSynthEnabled(false);
    audioService.setSoundType(SoundType.SAMPLE);
    expect(audioService.getBankSnapshot().synthEnabled).toBe(false);

    audioService.setSoundType(SoundType.SYNTH);
    expect(audioService.getBankSnapshot().synthEnabled).toBe(true);
  });
});

describe("audio analysers and lifecycle", () => {
  it("reads peak level from the main analyser", () => {
    engine.mainAnalyser = makeFloatAnalyser([0, -0.5, 0.25]);
    expect(audioService.getMainLevel()).toBeCloseTo(-6.0206, 3);
  });

  it("returns a default peak level when no peak analyser exists", () => {
    engine.peakAnalyser = null;
    expect(audioService.getPeakLevel()).toBe(-100);
  });

  it("computes stereo levels and caches waveform buffers", () => {
    engine.stereoAnalyserL = makeFloatAnalyser([0, 0.25, -0.75, 0]);
    engine.stereoAnalyserR = makeFloatAnalyser([0, -0.1, 0.3, 0.4]);

    const levels = audioService.getStereoLevels();

    expect(levels.left).toBeCloseTo(0.75, 6);
    expect(levels.right).toBeCloseTo(0.4, 6);
    expect(engine.stereoBufferL).toBeInstanceOf(Float32Array);
    expect(engine.stereoBufferR).toBeInstanceOf(Float32Array);
  });

  it("returns null stereo waveform without both analysers", () => {
    engine.stereoAnalyserL = makeFloatAnalyser([0, 0.2]);
    engine.stereoAnalyserR = null;
    expect(audioService.getStereoWaveform()).toBeNull();
  });

  it("reuses stereo waveform buffers between calls", () => {
    engine.stereoAnalyserL = makeFloatAnalyser([0, 0.2, -0.4, 0]);
    engine.stereoAnalyserR = makeFloatAnalyser([0, -0.3, 0.1, 0.5]);

    const first = audioService.getStereoWaveform();
    const second = audioService.getStereoWaveform();

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second?.left).toBe(first?.left);
    expect(second?.right).toBe(first?.right);
    expect(Array.from(second?.left ?? [])[1]).toBeCloseTo(0.2, 6);
    expect(Array.from(second?.left ?? [])[2]).toBeCloseTo(-0.4, 6);
    expect(Array.from(second?.right ?? [])[1]).toBeCloseTo(-0.3, 6);
    expect(Array.from(second?.right ?? [])[3]).toBeCloseTo(0.5, 6);
  });

  it("delegates primeFromGesture to init and resume", async () => {
    const initSpy = vi.spyOn(audioService, "init").mockResolvedValue(undefined);
    const resumeSpy = vi.spyOn(audioService, "resume").mockResolvedValue(undefined);

    await audioService.primeFromGesture();

    expect(initSpy).toHaveBeenCalledTimes(1);
    expect(resumeSpy).toHaveBeenCalledTimes(1);
  });

  it("resumes the audio context and starts background drone when hidden", async () => {
    const resumeSpy = vi.fn(async () => {
      ctx.state = "running";
    });
    const ctx = {
      state: "suspended",
      resume: resumeSpy,
    };
    engine.ctx = ctx;
    engine.iosSilentTick = vi.fn().mockResolvedValue(undefined);
    engine.startBackgroundDrone = vi.fn();
    vi.stubGlobal("document", { hidden: true });

    await audioService.resume();

    expect(engine.shouldPlay).toBe(true);
    expect(resumeSpy).toHaveBeenCalledTimes(1);
    expect(engine.iosSilentTick).toHaveBeenCalledTimes(1);
    expect(engine.startBackgroundDrone).toHaveBeenCalledTimes(1);
  });

  it("keeps the context alive on suspend when a mic stream is attached", async () => {
    const suspendSpy = vi.fn();
    engine.ctx = { suspend: suspendSpy };
    engine.micStream = { getTracks: () => [] };
    engine.stopBackgroundDrone = vi.fn();

    await audioService.suspend();

    expect(engine.shouldPlay).toBe(false);
    expect(engine.stopBackgroundDrone).toHaveBeenCalledTimes(1);
    expect(suspendSpy).not.toHaveBeenCalled();
  });

  it("suspends the context when mic capture is not active", async () => {
    const suspendSpy = vi.fn().mockResolvedValue(undefined);
    engine.ctx = { suspend: suspendSpy };
    engine.stopBackgroundDrone = vi.fn();
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia: vi.fn() } });

    await audioService.suspend();

    expect(suspendSpy).toHaveBeenCalledTimes(1);
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
    engine.lastAudioSettings = { ...defaultAudioSettings };
    engine.lastMusicSettings = { ...defaultMusicSettings };
    engine.granularNode = {
      connect: vi.fn(),
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

  it("updates compressor, limiter, EQ and wet routing from settings", () => {
    const capture = () => vi.fn<(value: number, at: number, tc: number) => void>();
    const masterSet = capture();
    const thresholdSet = capture();
    const ratioSet = capture();
    const attackSet = capture();
    const releaseSet = capture();
    const makeupSet = capture();
    const limiterSet = capture();
    const lowSet = capture();
    const midSet = capture();
    const highSet = capture();
    const reverbSet = capture();
    const drySet = capture();
    const pingSet = capture();
    const fbLSet = capture();
    const fbRSet = capture();
    const delayLSet = capture();
    const delayRSet = capture();

    engine.ctx = { currentTime: 4 };
    engine.masterGain = { gain: { setTargetAtTime: masterSet } };
    engine.compressorNode = {
      threshold: { setTargetAtTime: thresholdSet },
      ratio: { setTargetAtTime: ratioSet },
      attack: { setTargetAtTime: attackSet },
      release: { setTargetAtTime: releaseSet },
    };
    engine.makeupGain = { gain: { setTargetAtTime: makeupSet } };
    engine.limiterNode = { threshold: { setTargetAtTime: limiterSet } };
    engine.lowEQ = { gain: { setTargetAtTime: lowSet } };
    engine.midEQ = { gain: { setTargetAtTime: midSet } };
    engine.highEQ = { gain: { setTargetAtTime: highSet } };
    engine.reverbGain = { gain: { setTargetAtTime: reverbSet } };
    engine.dryGain = { gain: { setTargetAtTime: drySet } };
    engine.pingPongReturn = { gain: { setTargetAtTime: pingSet } };
    engine.feedbackL = { gain: { setTargetAtTime: fbLSet } };
    engine.feedbackR = { gain: { setTargetAtTime: fbRSet } };
    engine.delayL = { delayTime: { setTargetAtTime: delayLSet } };
    engine.delayR = { delayTime: { setTargetAtTime: delayRSet } };
    engine.lastMusicSettings = { ...defaultMusicSettings };

    audioService.updateSettings({
      ...defaultAudioSettings,
      volume: 2,
      low: -3,
      mid: 1.5,
      high: 4,
      reverbWet: 0.5,
      pingPongWet: 0.7,
      compThreshold: -18,
      compRatio: 4,
      compAttack: 0.01,
      compRelease: 0.8,
      makeupGainDb: 3,
      limiterThreshold: -2,
    });

    expect(masterSet).toHaveBeenCalledWith(1, 4, 0.1);
    expect(thresholdSet).toHaveBeenCalledWith(-18, 4, 0.05);
    expect(ratioSet).toHaveBeenCalledWith(4, 4, 0.05);
    expect(attackSet).toHaveBeenCalledWith(0.01, 4, 0.05);
    expect(releaseSet).toHaveBeenCalledWith(0.8, 4, 0.05);
    expect(makeupSet.mock.calls[0][0]).toBeCloseTo(Math.pow(10, 3 / 20), 6);
    expect(limiterSet).toHaveBeenCalledWith(-2, 4, 0.02);
    expect(lowSet).toHaveBeenCalledWith(-3, 4, 0.1);
    expect(midSet).toHaveBeenCalledWith(1.5, 4, 0.1);
    expect(highSet).toHaveBeenCalledWith(4, 4, 0.1);
    expect(reverbSet.mock.calls[0][0]).toBeGreaterThan(0.5);
    expect(drySet.mock.calls[0][0]).toBeLessThan(1);
    expect(pingSet).toHaveBeenCalled();
    expect(fbLSet).toHaveBeenCalled();
    expect(fbRSet).toHaveBeenCalled();
    expect(delayLSet).toHaveBeenCalled();
    expect(delayRSet).toHaveBeenCalled();
  });

  it("clamps master gain and reuses the last safe value for NaN", () => {
    const setTargetAtTime = vi.fn();
    engine.ctx = { currentTime: 2 };
    engine.masterGain = { gain: { setTargetAtTime } };

    audioService.setMasterGain(2);
    audioService.setMasterGain(Number.NaN);

    expect(setTargetAtTime).toHaveBeenNthCalledWith(1, 1, 2, 0.1);
    expect(setTargetAtTime).toHaveBeenNthCalledWith(2, 1, 2, 0.1);
  });

  it("clamps mic gain between 0 and 4", () => {
    const setTargetAtTime = vi.fn();
    engine.ctx = { currentTime: 7 };
    engine.micGain = { gain: { setTargetAtTime } };

    audioService.setMicGain(8);
    audioService.setMicGain(-2);

    expect(setTargetAtTime).toHaveBeenNthCalledWith(1, 4, 7, 0.05);
    expect(setTargetAtTime).toHaveBeenNthCalledWith(2, 0, 7, 0.05);
  });

  it("clamps EQ gains to a safe range", () => {
    const lowSet = vi.fn();
    const midSet = vi.fn();
    const highSet = vi.fn();
    engine.ctx = { currentTime: 1 };
    engine.lowEQ = { gain: { setTargetAtTime: lowSet } };
    engine.midEQ = { gain: { setTargetAtTime: midSet } };
    engine.highEQ = { gain: { setTargetAtTime: highSet } };

    audioService.setEqGains(-99, Number.NaN, 120);

    expect(lowSet).toHaveBeenCalledWith(-24, 1, 0.05);
    expect(midSet).toHaveBeenCalledWith(0, 1, 0.05);
    expect(highSet).toHaveBeenCalledWith(24, 1, 0.05);
  });

  it("clamps spatial control values", () => {
    audioService.setSpatialControl(3, -5, 2);
    expect(engine.spatialControl).toEqual({ pan: 1, depth: -1, width: 1 });
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

describe("engine stability and media handling", () => {
  it("respects MAX_VOICES polyphony guard in triggerSound", () => {
    engine.ctx = { state: "running" };
    engine.activeVoices = engine.MAX_VOICES;

    expect(() => {
      audioService.triggerSound(0.5, 440);
    }).not.toThrow();

    expect(engine.activeVoices).toBe(engine.MAX_VOICES);
  });

  it("returns early from triggerSound when playback should stay suspended", () => {
    engine.ctx = { state: "suspended" };
    engine.shouldPlay = false;

    expect(() => {
      audioService.triggerSound(0.5, 440);
    }).not.toThrow();

    expect(engine.activeVoices).toBe(0);
  });

  it("handles worklet loading failure gracefully", async () => {
    const mockCtx = {
      audioWorklet: {
        addModule: vi.fn().mockRejectedValue(new Error("Network Error")),
      },
    } as unknown as AudioContext;

    engine.ctx = mockCtx;
    engine.lofiWorkletLoading = null;
    engine.lofiWorkletLoaded = false;

    await engine.ensureLofiWorklet();

    expect(engine.lofiWorkletLoaded).toBe(false);
    expect(engine.lofiWorkletLoading).toBeNull();
  });

  it("prefers the recording destination stream over the live mic stream", () => {
    const liveStream = { id: "live" };
    const recordStream = { id: "record" };
    engine.micStream = liveStream;
    engine.micRecordDest = { stream: recordStream };

    expect(audioService.getMicRecordStream()).toBe(recordStream);

    engine.micRecordDest = null;
    expect(audioService.getMicRecordStream()).toBe(liveStream);
  });

  it("attaches a new mic stream and reconnects the mic chain", () => {
    const oldDisconnect = vi.fn();
    const sourceConnect = vi.fn();
    const sourceNode = { connect: sourceConnect };
    const gainConnect = vi.fn();
    const gainNode = { gain: { value: 0 }, connect: gainConnect, disconnect: vi.fn() };
    const stream = { id: "mic-stream" };

    engine.ctx = {
      createMediaStreamSource: vi.fn(() => sourceNode),
      createGain: vi.fn(() => gainNode),
    };
    engine.micSource = { disconnect: oldDisconnect };
    engine.micComp = { id: "compressor" };
    engine.micGain = null;

    audioService.attachMicStream(stream as unknown as MediaStream);

    expect(oldDisconnect).toHaveBeenCalledTimes(1);
    expect(engine.ctx.createMediaStreamSource).toHaveBeenCalledWith(stream);
    expect(engine.ctx.createGain).toHaveBeenCalledTimes(1);
    expect(gainConnect).toHaveBeenCalledWith(engine.micComp);
    expect(sourceConnect).toHaveBeenCalledWith(gainNode);
    expect(audioService.getMicStream()).toBe(stream);
  });

  it("falls back to generic getUserMedia constraints when the preferred ones fail", async () => {
    const stream = {
      getAudioTracks: () => [{ enabled: false }],
    };
    const getUserMedia = vi
      .fn()
      .mockRejectedValueOnce(new Error("preferred constraints failed"))
      .mockResolvedValueOnce(stream);
    const attachSpy = vi.spyOn(audioService, "attachMicStream").mockImplementation(() => {});
    const resumeSpy = vi.spyOn(audioService, "resume").mockResolvedValue(undefined);
    const ctxResumeSpy = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(audioService, "init").mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
    vi.stubGlobal("performance", { now: () => 123 });

    engine.ctx = { state: "suspended", resume: ctxResumeSpy };

    await audioService.ensureMic({ fromUserGesture: true });

    expect(getUserMedia).toHaveBeenNthCalledWith(1, {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        channelCount: 1,
        sampleRate: 48000,
      },
    });
    expect(getUserMedia).toHaveBeenNthCalledWith(2, { audio: true });
    expect(attachSpy).toHaveBeenCalledWith(stream);
    expect(resumeSpy).toHaveBeenCalledTimes(1);
    expect(ctxResumeSpy).toHaveBeenCalledTimes(1);
  });

  it("returns a floor mic level when no mic meter exists", () => {
    engine.micMeter = null;
    expect(audioService.getMicLevelDb()).toBe(-120);
  });

  it("computes the mic peak level from waveform bytes", () => {
    engine.micMeter = makeByteAnalyser([128, 255, 128, 0]);
    expect(audioService.getMicLevelDb()).toBeCloseTo(0, 4);
  });

  it("loads sample files while skipping long and broken assets", async () => {
    vi.spyOn(audioService, "init").mockResolvedValue(undefined);
    engine.ctx = {
      decodeAudioData: vi
        .fn()
        .mockResolvedValueOnce(makeAudioBuffer(12))
        .mockRejectedValueOnce(new Error("decode failed"))
        .mockResolvedValueOnce(makeAudioBuffer(2)),
    };

    const result = await audioService.loadSampleFiles([
      makeFile("too-long.wav"),
      makeFile("broken.wav"),
      makeFile("usable.wav"),
    ]);

    expect(result).toEqual({ loaded: 1, skipped: 2 });
    expect(audioService.getBankSnapshot().smp.some(Boolean)).toBe(true);
  });

  it("overwrites sample slots starting from the requested index", async () => {
    vi.spyOn(audioService, "init").mockResolvedValue(undefined);
    engine.ctx = {
      decodeAudioData: vi.fn().mockResolvedValue(makeAudioBuffer(1)),
    };
    engine.sampleBank[4] = makeAudioBuffer(1);
    engine.sampleBank[5] = makeAudioBuffer(1);

    const result = await audioService.loadSampleFiles(
      [makeFile("slot-5.wav"), makeFile("slot-6.wav")],
      4,
      { overwrite: true },
    );

    expect(result).toEqual({ loaded: 2, skipped: 0 });
    expect(audioService.getBankSnapshot().smp[4]).toBe(true);
    expect(audioService.getBankSnapshot().smp[5]).toBe(true);
  });

  it("rejects mic recordings longer than ten seconds", async () => {
    vi.spyOn(audioService, "init").mockResolvedValue(undefined);
    engine.ctx = {
      decodeAudioData: vi.fn().mockResolvedValue(makeAudioBuffer(11)),
    };

    const ok = await audioService.loadMicSampleBlob(new Blob(["long"]));
    expect(ok).toBe(false);
  });

  it("stores a mic recording and advances the insert cursor", async () => {
    vi.spyOn(audioService, "init").mockResolvedValue(undefined);
    engine.ctx = {
      decodeAudioData: vi.fn().mockResolvedValue(makeAudioBuffer(1.5)),
    };
    engine.micInsertIndex = 2;

    const ok = await audioService.loadMicSampleBlob(new Blob(["short"]));

    expect(ok).toBe(true);
    expect(audioService.getBankSnapshot().mic[2]).toBe(true);
    expect(engine.micInsertIndex).toBe(3);
  });

  it("stores a sample blob in the first free sample slot", async () => {
    vi.spyOn(audioService, "init").mockResolvedValue(undefined);
    engine.ctx = {
      decodeAudioData: vi.fn().mockResolvedValue(makeAudioBuffer(1)),
    };
    engine.sampleBank[0] = makeAudioBuffer(1);

    await audioService.loadSampleBlob(new Blob(["sample"]));

    expect(audioService.getBankSnapshot().smp[0]).toBe(true);
    expect(audioService.getBankSnapshot().smp[1]).toBe(true);
  });

  it("returns the current context state when available", () => {
    expect(audioService.getContextState()).toBeNull();
    engine.ctx = { state: "running" };
    expect(audioService.getContextState()).toBe("running");
  });
});
