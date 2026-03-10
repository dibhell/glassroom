import { Card, CardContent } from "@/components/ui/card";
import type { Session } from "@/lib/session-types";

interface SessionStatsProps {
  sessions: Session[];
}

export function SessionStats({ sessions }: SessionStatsProps) {
  const upcoming = sessions.filter((session) => {
    return new Date(session.startsAt).getTime() > Date.now();
  }).length;

  const totalMinutes = sessions.reduce((total, session) => {
    return total + session.durationMinutes;
  }, 0);

  return (
    <Card className="border-white/15 bg-black/20">
      <CardContent className="grid grid-cols-1 gap-4 pt-5 sm:grid-cols-3">
        <Stat label="Zaplanowane sesje" value={sessions.length.toString()} className="sm:border-r sm:border-white/10 sm:pr-4" />
        <Stat label="Nadchodzące" value={upcoming.toString()} className="sm:border-r sm:border-white/10 sm:px-4" />
        <Stat label="Łączny czas" value={`${totalMinutes} min`} className="sm:pl-4" />
      </CardContent>
    </Card>
  );
}

interface StatProps {
  label: string;
  value: string;
  className?: string;
}

function Stat({ label, value, className }: StatProps) {
  return (
    <div className={className}>
      <p className="text-xs uppercase tracking-[0.12em] text-emerald-100/55">{label}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
