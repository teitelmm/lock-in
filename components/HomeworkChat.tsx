"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

type Mode = "tutor" | "solve";
type Message = { role: "user" | "assistant"; content: string };

const SHOW_ANSWER = "Just show me the full solution and the final answer.";

export function HomeworkChat({
  id,
  initialMode,
  problem,
  imageUrl,
  initialMessages,
}: {
  id: string;
  initialMode: Mode;
  problem: string;
  imageUrl: string | null;
  initialMessages: Message[];
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const started = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function send(message?: string, switchTo?: Mode) {
    setStreaming(true);
    setMessages((m) => [...m, ...(message ? [{ role: "user" as const, content: message }] : []), { role: "assistant", content: "" }]);
    if (switchTo) setMode(switchTo);

    const appendToReply = (text: string) =>
      setMessages((m) => {
        const copy = [...m];
        const last = copy[copy.length - 1];
        copy[copy.length - 1] = { ...last, content: last.content + text };
        return copy;
      });

    try {
      const res = await fetch(`/api/homework/${id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, mode: switchTo }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        appendToReply(`⚠️ ${data.error || "Something went wrong. Try again."}`);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        appendToReply(decoder.decode(value, { stream: true }));
      }
    } catch {
      appendToReply("\n\n⚠️ Lost connection. Check your internet and try again.");
    } finally {
      setStreaming(false);
    }
  }

  // Kick off the first reply when the session is new.
  useEffect(() => {
    if (started.current || initialMessages.some((m) => m.role === "assistant")) return;
    started.current = true;
    void send();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, streaming]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    void send(text);
  }

  return (
    <div className="space-y-4">
      <div className="mt-2 flex items-center gap-2">
        <h1 className="text-2xl font-extrabold">Homework</h1>
        <span className="rounded-lg bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">
          {mode === "tutor" ? "Tutor mode" : "Steps + answer"}
        </span>
      </div>

      <div className="panel">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted">Your problem</div>
        {problem && <p className="mt-1 whitespace-pre-wrap">{problem}</p>}
        {imageUrl && (
          // Signed Supabase URL, so next/image's domain allowlist doesn't apply.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Homework photo" className="mt-3 max-h-80 rounded-xl border border-border" />
        )}
      </div>

      {messages.map((m, i) =>
        m.role === "assistant" ? (
          <div key={i} className="panel prose-lite">
            {m.content ? (
              <ReactMarkdown>{m.content}</ReactMarkdown>
            ) : (
              <span className="inline-flex gap-1 py-2" aria-label="Thinking">
                <span className="h-2 w-2 animate-bounce rounded-full bg-accent" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:0.15s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-accent [animation-delay:0.3s]" />
              </span>
            )}
          </div>
        ) : (
          <div key={i} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl bg-accent px-4 py-2.5 text-white">
            {m.content}
          </div>
        ),
      )}

      <form onSubmit={submit} className="sticky bottom-3 space-y-2 rounded-2xl border border-border bg-bg/95 p-2 backdrop-blur">
        <div className="flex gap-2">
          <input
            className="input"
            placeholder={mode === "tutor" ? "Type your answer or ask for a hint…" : "Ask a follow-up question…"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={streaming}
          />
          <button className="btn btn-primary" disabled={streaming || !input.trim()}>
            Send
          </button>
        </div>
        {mode === "tutor" && (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn py-1.5 text-sm" disabled={streaming} onClick={() => send("Can I get a hint?")}>
              💡 Hint
            </button>
            <button type="button" className="btn py-1.5 text-sm" disabled={streaming} onClick={() => send(SHOW_ANSWER, "solve")}>
              ✅ Just show me the answer
            </button>
          </div>
        )}
      </form>
      <div ref={bottomRef} />
    </div>
  );
}
