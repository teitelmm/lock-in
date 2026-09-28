"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { uploadFile } from "@/lib/upload";

type Mode = "tutor" | "solve";

const MODES: { mode: Mode; icon: string; title: string; body: string }[] = [
  { mode: "tutor", icon: "🧑‍🏫", title: "Tutor me", body: "Walk me through it one step at a time so I learn it." },
  { mode: "solve", icon: "✅", title: "Steps + answer", body: "Show me the worked steps and the final answer." },
];

export default function HomeworkPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("tutor");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const image = photo ? await uploadFile(photo) : null;
      const { data, error } = await createClient()
        .from("homework")
        .insert({ mode, problem_text: text.trim(), image_path: image?.path ?? null })
        .select("id")
        .single();
      if (error || !data) throw new Error("Couldn't save your problem. Try again.");
      router.push(`/homework/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Homework helper</h1>
        <p className="mt-1 text-muted">Type the problem or snap a photo of it.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {MODES.map((m) => (
          <button
            type="button"
            key={m.mode}
            onClick={() => setMode(m.mode)}
            aria-pressed={mode === m.mode}
            className={`panel flex items-start gap-3 text-left transition ${mode === m.mode ? "border-accent ring-2 ring-accent/30" : "hover:border-accent"}`}
          >
            <span className="text-3xl">{m.icon}</span>
            <span>
              <span className="block font-bold">{m.title}</span>
              <span className="text-sm text-muted">{m.body}</span>
            </span>
          </button>
        ))}
      </div>

      <div>
        <label className="label" htmlFor="problem">The problem</label>
        <textarea
          id="problem"
          rows={5}
          className="input"
          placeholder="e.g. Solve 3x + 7 = 22, or paste a question from your worksheet"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
          📷 {photo ? "Change photo" : "Add a photo"}
        </button>
        {photo && (
          <span className="flex items-center gap-2 text-sm text-muted">
            {photo.name}
            <button type="button" className="hover:text-bad" onClick={() => setPhoto(null)} aria-label="Remove photo">
              ✕
            </button>
          </span>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
        />
      </div>

      {error && <p className="rounded-xl bg-bad-soft p-3 text-bad">{error}</p>}

      <button className="btn btn-primary w-full py-3 text-lg" disabled={busy || (!text.trim() && !photo)}>
        {busy ? "Uploading…" : mode === "tutor" ? "Start tutoring →" : "Solve it →"}
      </button>
    </form>
  );
}
