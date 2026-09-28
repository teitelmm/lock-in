"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/upload";

const ACCEPT = ".pptx,.pdf,.docx,.txt,.md,.png,.jpg,.jpeg,.webp,.gif,image/*";
const MAX_FILES = 10;

const LOADING_LINES = [
  "Reading your material…",
  "Picking out the key terms…",
  "Writing flashcards…",
  "Making tricky wrong answers…",
  "Checking the quiz…",
  "Almost ready…",
];

export default function NewSetPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [text, setText] = useState("");
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [line, setLine] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setLine((l) => Math.min(l + 1, LOADING_LINES.length - 1)), 6000);
    return () => clearInterval(t);
  }, [busy]);

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, MAX_FILES));
  }

  async function generate() {
    setBusy(true);
    setLine(0);
    setError("");
    try {
      const uploaded = [];
      for (const f of files) uploaded.push(await uploadFile(f));
      const res = await fetch("/api/sets/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: uploaded, text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
      router.push(`/sets/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <div className="panel mx-auto max-w-md py-12 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-accent-soft border-t-accent" />
        <p className="mt-6 text-lg font-bold">{LOADING_LINES[line]}</p>
        <p className="mt-1 text-sm text-muted">Big slide decks can take a minute. Don&apos;t close this tab.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">New study set</h1>
        <p className="mt-1 text-muted">Upload what your teacher gave you. You&apos;ll get flashcards, a quiz, and games.</p>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`flex w-full flex-col items-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition ${
          dragging ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent"
        }`}
      >
        <span className="text-4xl">📤</span>
        <span className="mt-2 text-lg font-bold">Drop files here or tap to choose</span>
        <span className="mt-1 text-sm text-muted">PowerPoint (.pptx), PDF, Word (.docx), text, or photos of your notes</span>
      </button>
      <input ref={inputRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={(e) => addFiles(e.target.files)} />

      {files.length > 0 && (
        <ul className="space-y-2">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="panel flex items-center gap-3 py-3">
              <span className="truncate font-medium">{f.name}</span>
              <span className="ml-auto shrink-0 text-sm text-muted">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
              <button
                type="button"
                aria-label={`Remove ${f.name}`}
                className="rounded-lg px-2 text-muted hover:bg-surface-2 hover:text-bad"
                onClick={() => setFiles(files.filter((_, j) => j !== i))}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div>
        <label className="label" htmlFor="notes">Or paste notes</label>
        <textarea
          id="notes"
          rows={6}
          className="input"
          placeholder="Paste your class notes, a study guide, or vocab list…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </div>

      {error && <p className="rounded-xl bg-bad-soft p-3 text-bad">{error}</p>}

      <button className="btn btn-primary w-full py-3 text-lg" disabled={!files.length && !text.trim()} onClick={generate}>
        Make my study set ✨
      </button>
    </div>
  );
}
