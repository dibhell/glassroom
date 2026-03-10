export type SessionEnergy = "focus" | "calm" | "hype";

export interface Session {
  id: string;
  title: string;
  host: string;
  startsAt: string;
  durationMinutes: number;
  notes: string;
  energy: SessionEnergy;
  createdAt: string;
}

export interface SessionDraft {
  title: string;
  host: string;
  startsAt: string;
  durationMinutes: number;
  notes: string;
  energy: SessionEnergy;
}

export interface SessionActionResult {
  status: "success" | "error";
  message: string;
}
