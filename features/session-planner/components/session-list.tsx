import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Session } from "@/lib/session-types";

import { SessionCard } from "./session-card";

interface SessionListProps {
  sessions: Session[];
}

export function SessionList({ sessions }: SessionListProps) {
  if (!sessions.length) {
    return (
      <Card className="h-full border-dashed border-white/20 bg-black/20">
        <CardHeader>
          <CardTitle>Brak zaplanowanych sesji</CardTitle>
          <CardDescription>
            Dodaj pierwszą sesję po lewej stronie, aby uruchomić harmonogram.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <SessionCard key={session.id} session={session} />
      ))}
    </div>
  );
}
