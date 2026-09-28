"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function DeleteSetButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm("Delete this study set? This can't be undone.")) return;
    setBusy(true);
    const { error } = await createClient().from("study_sets").delete().eq("id", id);
    if (error) {
      setBusy(false);
      alert("Couldn't delete the set. Try again.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <button onClick={remove} disabled={busy} className="text-sm text-muted hover:text-bad">
      {busy ? "Deleting…" : "Delete set"}
    </button>
  );
}
