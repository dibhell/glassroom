import "@testing-library/jest-dom/vitest";

if (typeof HTMLCanvasElement !== "undefined") {
  // jsdom does not implement canvas 2D context without native canvas package.
  HTMLCanvasElement.prototype.getContext = (() => null) as any;
}
