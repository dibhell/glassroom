/** @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../components/Visualizer", () => {
  return {
    Visualizer: () => <div data-testid="visualizer" />,
  };
});

vi.mock("../components/Mixer", () => ({
  Mixer: () => <div data-testid="mixer" />,
}));

vi.mock("../components/BufferedKnob", () => ({
  BufferedKnob: () => <div data-testid="buffered-knob" />,
}));

const { audioServiceMock } = vi.hoisted(() => ({
  audioServiceMock: {
    updateSettings: vi.fn(),
    updateMusicSettings: vi.fn(),
    primeFromGesture: vi.fn(async () => {}),
    init: vi.fn(async () => {}),
    resume: vi.fn(async () => {}),
    suspend: vi.fn(async () => {}),
    getContextState: vi.fn(() => "running"),
    setReverbWet: vi.fn(),
    setPingPongWet: vi.fn(),
  },
}));

vi.mock("../services/audioEngine", () => ({
  audioService: audioServiceMock,
}));

import App from "../App";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("App UI regression (RTL)", () => {
  it("renders version link to test report and updated footer year", () => {
    render(<App />);

    expect(screen.getByText(/Studio Pop/i)).toBeInTheDocument();
    expect(screen.getByText(/\(c\)\s*2026/i)).toBeInTheDocument();
    const versionLink = screen.getByRole("link", { name: "v1.5.0" });
    expect(versionLink).toHaveAttribute("href", expect.stringContaining("/reports/executive_test_report.html"));
  });

  it("shows ENTER ROOM overlay and calls audio bootstrap on click", async () => {
    render(<App />);
    const enter = screen.getAllByRole("button", { name: /enter room/i })[0];
    fireEvent.click(enter);

    await waitFor(() => expect(audioServiceMock.primeFromGesture).toHaveBeenCalled());
    await waitFor(() => expect(audioServiceMock.init).toHaveBeenCalled());
  });

  it("opens and closes the Music panel from icon click and outside click", async () => {
    render(<App />);
    const musicButton = screen.getByRole("button", { name: /music/i });
    fireEvent.click(musicButton);
    expect(screen.getByText(/Avoid Leading Tone/i)).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(screen.queryByText(/Avoid Leading Tone/i)).not.toBeInTheDocument();
    });
  });

  it("propagates music setting changes to audioService.updateMusicSettings", async () => {
    render(<App />);
    const musicButton = screen.getByRole("button", { name: /music/i });
    fireEvent.click(musicButton);

    const noThirds = screen.getByLabelText(/No 3rd Filter/i);
    fireEvent.click(noThirds);

    await waitFor(() => expect(audioServiceMock.updateMusicSettings).toHaveBeenCalled());
    const lastCall = audioServiceMock.updateMusicSettings.mock.calls.at(-1)?.[0];
    expect(lastCall?.noThirds).toBe(true);
  });
});
