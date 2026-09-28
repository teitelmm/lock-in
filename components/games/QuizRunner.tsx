"use client";

import { useState } from "react";
import { saveAttempt } from "@/lib/attempts";
import { isCloseEnough, shuffle } from "@/lib/match";
import type { Question } from "@/lib/schemas";
import { EndScreen, cheer } from "./EndScreen";

type Result = { question: Question; given: string; correct: boolean };

export function QuizRunner({ setId, questions }: { setId: string; questions: Question[] }) {
  const [deck, setDeck] = useState(() => prepare(questions));
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [isRetry, setIsRetry] = useState(false);

  const q = deck[index];
  const done = index >= deck.length;

  function answer(value: string) {
    if (given !== null) return;
    const correct = q.type === "short" ? isCloseEnough(value, q.answer) : value === q.answer;
    setGiven(value);
    setResults((r) => [...r, { question: q, given: value, correct }]);
  }

  function overrideCorrect() {
    setResults((r) => r.map((res, i) => (i === r.length - 1 ? { ...res, correct: true } : res)));
  }

  function next() {
    const nextIndex = index + 1;
    setIndex(nextIndex);
    setGiven(null);
    setTyped("");
    if (nextIndex >= deck.length && !isRetry) {
      void saveAttempt(setId, "quiz", results.filter((r) => r.correct).length, deck.length);
    }
  }

  function restart(only?: Question[]) {
    setDeck(prepare(only ?? questions));
    setIsRetry(Boolean(only));
    setIndex(0);
    setGiven(null);
    setTyped("");
    setResults([]);
  }

  if (done) {
    const right = results.filter((r) => r.correct).length;
    const missed = results.filter((r) => !r.correct);
    return (
      <EndScreen
        setId={setId}
        headline={cheer(right / deck.length)}
        score={`${right}/${deck.length}`}
        detail={isRetry ? "Retry round (not counted toward your best)" : `${Math.round((right / deck.length) * 100)}% correct`}
        onReplay={() => restart()}
        replayLabel="Take it again"
        extraAction={
          missed.length > 0 && (
            <button className="btn" onClick={() => restart(missed.map((m) => m.question))}>
              Retry the {missed.length} I missed
            </button>
          )
        }
      >
        {missed.length > 0 && (
          <div className="panel space-y-4">
            <h2 className="font-bold">Review what you missed</h2>
            {missed.map((m, i) => (
              <div key={i} className="border-t border-border pt-3 first:border-0 first:pt-0">
                <p className="font-semibold">{m.question.prompt}</p>
                <p className="mt-1 text-sm text-bad">You said: {m.given || "(blank)"}</p>
                <p className="text-sm text-good">Answer: {m.question.answer}</p>
                {m.question.explanation && <p className="mt-1 text-sm text-muted">{m.question.explanation}</p>}
              </div>
            ))}
          </div>
        )}
      </EndScreen>
    );
  }

  const last = results[results.length - 1];
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-sm text-muted">
        <span>
          Question {index + 1} of {deck.length}
        </span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${(index / deck.length) * 100}%` }} />
        </div>
      </div>

      <div className="panel">
        <p className="text-xl font-bold leading-snug">{q.prompt}</p>

        {q.type === "short" ? (
          <form
            className="mt-5 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (typed.trim()) answer(typed);
            }}
          >
            <input className="input" autoFocus placeholder="Type your answer" value={typed} disabled={given !== null} onChange={(e) => setTyped(e.target.value)} />
            {given === null && <button className="btn btn-primary">Check</button>}
          </form>
        ) : (
          <div className="mt-5 grid gap-2">
            {q.choices.map((c, i) => {
              const state =
                given === null ? "border-border" : c === q.answer ? "border-good bg-good-soft" : c === given ? "border-bad bg-bad-soft" : "border-border opacity-60";
              return (
                <button
                  key={c}
                  onClick={() => answer(c)}
                  disabled={given !== null}
                  className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left font-medium transition enabled:hover:border-accent ${state}`}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface-2 text-sm font-bold">
                    {q.type === "true_false" ? (c === "True" ? "T" : "F") : "ABCD"[i]}
                  </span>
                  {c}
                </button>
              );
            })}
          </div>
        )}

        {given !== null && last && (
          <div className={`mt-5 rounded-xl p-4 ${last.correct ? "bg-good-soft" : "bg-bad-soft"}`}>
            <p className={`font-bold ${last.correct ? "text-good" : "text-bad"}`}>
              {last.correct ? "Correct! 🎉" : `Not quite. Answer: ${q.answer}`}
            </p>
            {q.explanation && <p className="mt-1 text-sm">{q.explanation}</p>}
            {!last.correct && q.type === "short" && (
              <button className="mt-2 text-sm font-semibold text-accent underline" onClick={overrideCorrect}>
                I was right (count it)
              </button>
            )}
          </div>
        )}
      </div>

      {given !== null && (
        <button className="btn btn-primary w-full py-3" onClick={next} autoFocus>
          {index + 1 < deck.length ? "Next question →" : "See my score"}
        </button>
      )}
    </div>
  );
}

function prepare(questions: Question[]): Question[] {
  return shuffle(questions).map((q) => (q.type === "mcq" ? { ...q, choices: shuffle(q.choices) } : q));
}
