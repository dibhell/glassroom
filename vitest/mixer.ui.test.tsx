/** @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioSettings } from "../types";

vi.mock("../components/BufferedKnob", () => ({
  BufferedKnob: () => <div data-testid="buffered-knob" />,
}));

vi.mock("../components/TapeCassette", () => ({
  TapeCassette: () => <div data-testid="tape-cassette" />,
}));

const { bankState, audioServiceMock } = vi.hoisted(() => {
  const state = {
    mic: [false, false, false, false, false, false],
    smp: [true, false, false, false, false, false],
    loadedLabels: ["S01", "SNT"],
    synthEnabled: true,
    activePoolSize: 2,
  };
  return {
    bankState: state,
    audioServiceMock: {
      getBankSnapshot: vi.fn(() => ({
        mic: [...state.mic],
        smp: [...state.smp],
        loadedLabels: [...state.loadedLabels],
        synthEnabled: state.synthEnabled,
        activePoolSize: state.activePoolSize,
      })),
      ensureMic: vi.fn(async () => {}),
      setMicGain: vi.fn(),
      getPeakLevel: vi.fn(() => -12),
      getMainLevel: vi.fn(() => -10),
      getMicLevelDb: vi.fn(() => -30),
      primeFromGesture: vi.fn(async () => {}),
      loadSampleFiles: vi.fn(async () => ({ loaded: 1, skipped: 0 })),
      setSynthEnabled: vi.fn((enabled: boolean) => {
        state.synthEnabled = enabled;
      }),
      clearMicSlot: vi.fn(),
      clearSampleSlot: vi.fn((slot: number) => {
        state.smp[slot] = false;
      }),
      setLofiEnabled: vi.fn(),
      setLofiParams: vi.fn(),
      getMicStream: vi.fn(() => null),
      isMicBankFull: vi.fn(() => false),
      getMicRecordStream: vi.fn(() => null),
      loadMicSampleBlob: vi.fn(async () => true),
    },
  };
});

vi.mock("../services/audioEngine", () => ({
  audioService: audioServiceMock,
}));

import { Mixer } from "../components/Mixer";

const defaultSettings: AudioSettings = {
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

beforeEach(() => {
  bankState.mic = [false, false, false, false, false, false];
  bankState.smp = [true, false, false, false, false, false];
  bankState.loadedLabels = ["S01", "SNT"];
  bankState.synthEnabled = true;
  bankState.activePoolSize = 2;
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("Mixer UI (RTL)", () => {
  it("calls transport callbacks on play/stop click", () => {
    const onPlayPause = vi.fn();
    const onStop = vi.fn();
    const setSettings = vi.fn();
    const { container } = render(
      <Mixer settings={defaultSettings} setSettings={setSettings} isPlaying={false} onPlayPause={onPlayPause} onStop={onStop} />
    );

    const buttons = Array.from(container.querySelectorAll("button"));
    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[1]);

    expect(onPlayPause).toHaveBeenCalledTimes(1);
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it("toggles synth source from data section", () => {
    const setSettings = vi.fn();
    render(<Mixer settings={defaultSettings} setSettings={setSettings} isPlaying={false} onPlayPause={vi.fn()} onStop={vi.fn()} />);

    const synthToggle = screen.getByRole("button", { name: /synth on/i });
    fireEvent.click(synthToggle);

    expect(audioServiceMock.setSynthEnabled).toHaveBeenCalledWith(false);
  });

  it("loads sample files from hidden input change", async () => {
    const setSettings = vi.fn();
    const { container } = render(
      <Mixer settings={defaultSettings} setSettings={setSettings} isPlaying={false} onPlayPause={vi.fn()} onStop={vi.fn()} />
    );

    const input = container.querySelector("#sample-input") as HTMLInputElement;
    const file = new File(["fake"], "test.wav", { type: "audio/wav" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(audioServiceMock.primeFromGesture).toHaveBeenCalled());
    await waitFor(() => expect(audioServiceMock.loadSampleFiles).toHaveBeenCalled());
  });

  it("toggles LO-FI from cassette switch", () => {
    const setSettings = vi.fn();
    const { container } = render(
      <Mixer settings={defaultSettings} setSettings={setSettings} isPlaying={false} onPlayPause={vi.fn()} onStop={vi.fn()} />
    );

    const lofiButton = container.querySelector("button[aria-pressed]") as HTMLButtonElement;
    fireEvent.click(lofiButton);
    expect(audioServiceMock.setLofiEnabled).toHaveBeenCalledWith(true);
  });
});
