import { Zap } from "lucide-react";

import { createSessionAction } from "@/app/actions/session-actions";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SessionList } from "@/features/session-planner/components/session-list";
import { SessionPlannerForm } from "@/features/session-planner/components/session-planner-form";
import { SessionStats } from "@/features/session-planner/components/session-stats";
import { getSessions } from "@/lib/session-store";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const sessions = await getSessions();

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
            Harmonogram sesji oparty o React 19.2, RSC i TanStack Form.
          </h1>
          <p className="max-w-2xl text-emerald-50/70">
            Warstwa danych renderuje się po stronie serwera, a interaktywne formularze są
            ograniczone do lekkich komponentów klienckich.
          </p>
          <Separator />
        </header>

        <SessionStats sessions={sessions} />

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,26rem)_1fr]">
          <SessionPlannerForm createSessionAction={createSessionAction} />
          <SessionList sessions={sessions} />
        </section>
      </div>
    </main>
  );
}
