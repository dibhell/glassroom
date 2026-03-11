"use client";

import { useEffect, useState } from "react";

import { SessionList } from "@/features/session-planner/components/session-list";
import { SessionPlannerForm } from "@/features/session-planner/components/session-planner-form";
import { SessionStats } from "@/features/session-planner/components/session-stats";
import type { Session, SessionActionResult, SessionDraft } from "@/lib/session-types";

const storageKey = "glassroom.signal-board.local-sessions.v1";

interface SessionPlannerClientProps {
  initialSessions: Session[];
}

export function SessionPlannerClient({ initialSessions }: SessionPlannerClientProps) {
  const [localSessions, setLocalSessions] = useState<Session[]>([]);

  useEffect(() => {
    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Session[];
      if (Array.isArray(parsed)) {
        setLocalSessions(parsed);
      }
    } catch {
      window.localStorage.removeItem(storageKey);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(localSessions));
  }, [localSessions]);

  async function handleCreateSession(payload: SessionDraft): Promise<SessionActionResult> {
    const session: Session = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...payload,
    };

    setLocalSessions((current) => sortByStartTime([...current, session]));

    return {
      status: "success",
      message: "Session saved in your browser storage.",
    };
  }

  const sessions = sortByStartTime([...initialSessions, ...localSessions]);

  return (
    <>
      <SessionStats sessions={sessions} />

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <SessionPlannerForm onCreateSession={handleCreateSession} />
        <SessionList sessions={sessions} />
      </section>
    </>
  );
}

function sortByStartTime(sessions: Session[]) {
  return sessions.sort((left, right) => {
    return new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime();
  });
}
