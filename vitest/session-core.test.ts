import { afterEach, describe, expect, it, vi } from "vitest";

import { createSessionAction } from "../app/actions/session-actions";
import { formatSessionDate } from "../lib/date";
import { cn } from "../lib/utils";
import { sessionDraftSchema } from "../lib/session-validators";
import type { SessionDraft } from "../lib/session-types";

const { createSessionMock, revalidatePathMock } = vi.hoisted(() => ({
  createSessionMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/session-store", () => ({
  createSession: createSessionMock,
}));

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

const validDraft: SessionDraft = {
  title: " Afternoon Mix Review ",
  host: " Ada ",
  startsAt: "2026-08-12T10:30:00+02:00",
  durationMinutes: 45,
  notes: " Notes for the session ",
  energy: "focus",
};

afterEach(() => {
  vi.restoreAllMocks();
  createSessionMock.mockReset();
  revalidatePathMock.mockReset();
});

describe("session core helpers", () => {
  it("formats session dates for the Polish locale", () => {
    const formatted = formatSessionDate("2026-08-12T10:30:00+02:00");
    expect(formatted).toMatch(/2026/);
    expect(formatted.length).toBeGreaterThan(8);
  });

  it("merges Tailwind classes without keeping conflicting duplicates", () => {
    expect(cn("px-2", false && "hidden", "px-4", "text-sm")).toBe("px-4 text-sm");
  });
});

describe("session draft schema", () => {
  it("trims string fields and keeps enum values", () => {
    const parsed = sessionDraftSchema.parse(validDraft);

    expect(parsed.title).toBe("Afternoon Mix Review");
    expect(parsed.host).toBe("Ada");
    expect(parsed.notes).toBe("Notes for the session");
    expect(parsed.energy).toBe("focus");
  });

  it("defaults missing notes to an empty string", () => {
    const parsed = sessionDraftSchema.parse({ ...validDraft, notes: undefined as unknown as string });
    expect(parsed.notes).toBe("");
  });

  it("rejects titles shorter than three characters", () => {
    const result = sessionDraftSchema.safeParse({ ...validDraft, title: "ab" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/3/);
  });

  it("rejects hosts shorter than two characters", () => {
    const result = sessionDraftSchema.safeParse({ ...validDraft, host: "A" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/2/);
  });

  it("rejects invalid ISO datetimes", () => {
    const result = sessionDraftSchema.safeParse({ ...validDraft, startsAt: "tomorrow at noon" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/dat/i);
  });

  it("rejects durations below the minimum", () => {
    const result = sessionDraftSchema.safeParse({ ...validDraft, durationMinutes: 10 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/15/);
  });

  it("rejects durations above the maximum", () => {
    const result = sessionDraftSchema.safeParse({ ...validDraft, durationMinutes: 300 });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/240/);
  });

  it("rejects notes longer than the limit", () => {
    const result = sessionDraftSchema.safeParse({ ...validDraft, notes: "x".repeat(241) });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/240/);
  });

  it("rejects unknown energy values", () => {
    const result = sessionDraftSchema.safeParse({ ...validDraft, energy: "chaos" as SessionDraft["energy"] });
    expect(result.success).toBe(false);
  });
});

describe("createSessionAction", () => {
  it("returns the first validation error without hitting the store", async () => {
    const result = await createSessionAction({ ...validDraft, title: "x" });

    expect(result.status).toBe("error");
    expect(result.message).toMatch(/3/);
    expect(createSessionMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("persists valid payloads and revalidates the home page", async () => {
    createSessionMock.mockResolvedValue({ id: "session-1" });

    const result = await createSessionAction(validDraft);

    expect(result.status).toBe("success");
    expect(result.message).toMatch(/zapis/i);
    expect(createSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Afternoon Mix Review",
        host: "Ada",
        notes: "Notes for the session",
      }),
    );
    expect(revalidatePathMock).toHaveBeenCalledWith("/");
  });

  it("returns a generic persistence error when the store throws", async () => {
    createSessionMock.mockRejectedValue(new Error("disk full"));

    const result = await createSessionAction(validDraft);

    expect(result.status).toBe("error");
    expect(result.message).toMatch(/nie uda/i);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
