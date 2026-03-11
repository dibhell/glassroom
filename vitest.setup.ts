import "@testing-library/jest-dom/vitest";

if (typeof HTMLCanvasElement !== "undefined") {
  // Keep canvas deterministic in CI/jsdom where native canvas is unavailable.
  HTMLCanvasElement.prototype.getContext = (() => null) as any;
}
