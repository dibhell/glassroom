import { Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SessionPlannerClient } from "@/features/session-planner/components/session-planner-client";
import sessionsData from "@/data/sessions.json";
import type { Session } from "@/lib/session-types";

export default function HomePage() {
  const initialSessions = sessionsData as Session[];

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10 sm:px-8">
      <div className="background-orb background-orb-left" />
      <div className="background-orb background-orb-right" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-8">
        <header className="space-y-4">
          <Badge className="w-fit gap-2 px-3 py-1.5">
            <Zap className="size-3.5" />
            Glassroom Signal Board
          </Badge>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Session planner with React 19.2, RSC and TanStack Form.
          </h1>
          <p className="max-w-2xl text-emerald-50/70">
            Initial data is rendered on the server, while form interactions run in lean client
            components.
          </p>
          <Separator />
        </header>

        <SessionPlannerClient initialSessions={initialSessions} />
      </div>
    </main>
  );
}
