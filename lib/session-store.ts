import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { sessionDraftSchema } from "@/lib/session-validators";
import type { Session, SessionDraft } from "@/lib/session-types";

const dataDir = path.join(process.cwd(), "data");
const dataFile = path.join(dataDir, "sessions.json");

async function ensureDataFile() {
  await mkdir(dataDir, { recursive: true });

  try {
    await readFile(dataFile, "utf8");
  } catch {
    await writeFile(dataFile, "[]", "utf8");
  }
}

async function readSessions(): Promise<Session[]> {
  await ensureDataFile();
  const raw = await readFile(dataFile, "utf8");

  if (!raw.trim()) {
    return [];
  }

  const parsed = JSON.parse(raw) as Session[];
  return parsed.sort((left, right) => {
    return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
  });
}

async function writeSessions(sessions: Session[]) {
  await writeFile(dataFile, JSON.stringify(sessions, null, 2), "utf8");
}

export async function getSessions() {
  return readSessions();
}

export async function createSession(draft: SessionDraft) {
  const validDraft = sessionDraftSchema.parse(draft);
  const sessions = await readSessions();

  const session: Session = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    ...validDraft,
    notes: validDraft.notes ?? "",
  };

  sessions.push(session);
  await writeSessions(sessions);
  return session;
}
