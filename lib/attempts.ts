"use client";

import type { Mode } from "@/lib/sets";
import { createClient } from "@/lib/supabase/client";

/** Records a finished session. Failures are ignored: a lost score shouldn't interrupt studying. */
export async function saveAttempt(setId: string, mode: Mode, score: number, total: number) {
  try {
    await createClient().from("attempts").insert({ set_id: setId, mode, score, total });
  } catch {
    // ignore
  }
}
