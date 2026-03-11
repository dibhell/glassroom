import "@testing-library/jest-dom/vitest";

if (typeof HTMLCanvasElement !== "undefined") {
  // Keep canvas behavior deterministic in CI/jsdom without native canvas package.
  HTMLCanvasElement.prototype.getContext = (() => null) as any;
}
