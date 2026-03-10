import { Clock3, Mic2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSessionDate } from "@/lib/date";
import type { Session } from "@/lib/session-types";

const energyVariantMap: Record<Session["energy"], "default" | "calm" | "hype"> = {
  focus: "default",
  calm: "calm",
  hype: "hype",
};

const energyLabelMap: Record<Session["energy"], string> = {
  focus: "Focus",
  calm: "Calm",
  hype: "Hype",
};

interface SessionCardProps {
  session: Session;
}

export function SessionCard({ session }: SessionCardProps) {
  return (
    <Card className="border-white/15 bg-black/25">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-base">{session.title}</CardTitle>
          <Badge variant={energyVariantMap[session.energy]}>
            {energyLabelMap[session.energy]}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-50/70">
          <Mic2 className="size-3.5" />
          <span>{session.host}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-emerald-50/80">
        <p className="flex items-center gap-2">
          <Clock3 className="size-4 text-emerald-300" />
          {formatSessionDate(session.startsAt)} ({session.durationMinutes} min)
        </p>
        {session.notes ? <p className="leading-relaxed">{session.notes}</p> : null}
      </CardContent>
    </Card>
  );
}
