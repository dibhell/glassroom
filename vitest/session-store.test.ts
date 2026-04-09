import os from "node:os";
import path from "node:path";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";

import { afterEach, describe, expect, it, vi } from "vitest";

const originalCwd = process.cwd();

let tempDir: string | null = null;

async function loadStoreModule() {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "glassroom-session-store-"));
  process.chdir(tempDir);
  vi.resetModules();
  return import("../lib/session-store");
}

afterEach(async () => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.resetModules();
  process.chdir(originalCwd);

  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe("session store", () => {
  it("creates the backing file and returns an empty list when data is missing", async () => {
    const store = await loadStoreModule();

    await expect(store.getSessions()).resolves.toEqual([]);
    await expect(readFile(path.join(tempDir!, "data", "sessions.json"), "utf8")).resolves.toBe("[]");
  });

  it("returns an empty list when the data file is blank", async () => {
    const store = await loadStoreModule();
    await store.getSessions();
    await writeFile(path.join(tempDir!, "data", "sessions.json"), "   ", "utf8");

    await expect(store.getSessions()).resolves.toEqual([]);
  });

  it("sorts sessions by start time when reading from disk", async () => {
    const store = await loadStoreModule();
    await store.getSessions();
    await writeFile(
      path.join(tempDir!, "data", "sessions.json"),
      JSON.stringify([
        {
          id: "later",
          title: "Later",
          host: "Bob",
          startsAt: "2026-08-12T14:00:00+02:00",
          durationMinutes: 45,
          notes: "",
          energy: "focus",
          createdAt: "2026-08-01T08:00:00.000Z",
        },
        {
          id: "earlier",
          title: "Earlier",
          host: "Ada",
          startsAt: "2026-08-12T09:00:00+02:00",
          durationMinutes: 30,
          notes: "",
          energy: "calm",
          createdAt: "2026-08-01T07:00:00.000Z",
        },
      ]),
      "utf8",
    );

    const sessions = await store.getSessions();
    expect(sessions.map((session) => session.id)).toEqual(["earlier", "later"]);
  });

  it("persists a validated session with generated identifiers", async () => {
    const store = await loadStoreModule();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-10T08:15:00.000Z"));
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("session-1");

    const created = await store.createSession({
      title: "Evening Run",
      host: "Ada",
      startsAt: "2026-08-12T18:00:00+02:00",
      durationMinutes: 60,
      notes: "Needs extra routing notes",
      energy: "hype",
    });

    expect(created.id).toBe("session-1");
    expect(created.createdAt).toBe("2026-08-10T08:15:00.000Z");
    expect(created.notes).toBe("Needs extra routing notes");

    const raw = await readFile(path.join(tempDir!, "data", "sessions.json"), "utf8");
    const stored = JSON.parse(raw) as Array<{ id: string }>;
    expect(stored).toHaveLength(1);
    expect(stored[0]?.id).toBe("session-1");
  });

  it("normalizes missing notes to an empty string when saving", async () => {
    const store = await loadStoreModule();
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue("session-2");

    const created = await store.createSession({
      title: "Morning Check",
      host: "Bo",
      startsAt: "2026-08-12T08:00:00+02:00",
      durationMinutes: 30,
      notes: undefined as unknown as string,
      energy: "focus",
    });

    expect(created.notes).toBe("");
  });

  it("rejects invalid drafts before writing them", async () => {
    const store = await loadStoreModule();

    await expect(
      store.createSession({
        title: "x",
        host: "A",
        startsAt: "invalid",
        durationMinutes: 5,
        notes: "",
        energy: "focus",
      }),
    ).rejects.toThrow();

    await expect(readFile(path.join(tempDir!, "data", "sessions.json"), "utf8")).rejects.toThrow();
  });
});
