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

    expect(screen.getByText(/Studio Popłoch \(c\) 2026/i)).toBeInTheDocument();
    const versionLink = screen.getByRole("link", { name: "v1.5.0" });
    expect(versionLink).toHaveAttribute("href", expect.stringContaining("/reports/executive_test_report.html"));
  });

  it('shows ENTER ROOM overlay and calls audio bootstrap on click', async () => {
    render(<App />);
    const enter = screen.getAllByRole("button", { name: /enter room/i })[0];
    fireEvent.click(enter);

    await waitFor(() => expect(audioServiceMock.primeFromGesture).toHaveBeenCalled());
    await waitFor(() => expect(audioServiceMock.init).toHaveBeenCalled());
  });
});
