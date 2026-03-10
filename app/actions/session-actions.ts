"use server";

import { revalidatePath } from "next/cache";

import { createSession } from "@/lib/session-store";
import type { SessionActionResult, SessionDraft } from "@/lib/session-types";
import { sessionDraftSchema } from "@/lib/session-validators";

export async function createSessionAction(
  payload: SessionDraft,
): Promise<SessionActionResult> {
  const validation = sessionDraftSchema.safeParse(payload);

  if (!validation.success) {
    return {
      status: "error",
      message: validation.error.issues[0]?.message ?? "Dane formularza są niepoprawne.",
    };
  }

  try {
    await createSession(validation.data);
    revalidatePath("/");

    return {
      status: "success",
      message: "Sesja została zapisana.",
    };
  } catch {
    return {
      status: "error",
      message: "Nie udało się zapisać sesji.",
    };
  }
}
