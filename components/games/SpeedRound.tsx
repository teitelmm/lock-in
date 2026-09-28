"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { saveAttempt } from "@/lib/attempts";
import { buildSpeedPool, streakMultiplier, type ChoiceItem } from "@/lib/games";
import type { Card, Question } from "@/lib/schemas";
import { EndScreen } from "./EndScreen";

const ROUND_SECONDS = 60;

export function SpeedRound({ setId, cards, questions, best }: { setId: string; cards: Card[]; questions: Question[]; best: number }) {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [pool, setPool] = useState<ChoiceItem[]>(() => buildSpeedPool(cards, questions));
  const [index, setIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [flash, setFlash] = useState<{ choice: string; good: boolean } | null>(null);
  const [record, setRecord] = useState(best);
  const endsAt = useRef(0);
  const pointsRef = useRef(0);
  const answeredRef = useRef(0);

  const item = pool[index % Math.max(pool.length, 1)];

  function start() {
    setPool(buildSpeedPool(cards, questions));
    setIndex(0);
    setPoints(0);
    setStreak(0);
    setBestStreak(0);
    setAnswered(0);
    setCorrect(0);
    setFlash(null);
    pointsRef.current = 0;
    answeredRef.current = 0;
    endsAt.current = Date.now() + ROUND_SECONDS * 1000;
    setTimeLeft(ROUND_SECONDS);
    setPhase("playing");
  }

  useEffect(() => {
    if (phase !== "playing") return;
    const t = setInterval(() => {
      const left = Math.max(0, (endsAt.current - Date.now()) / 1000);
      setTimeLeft(left);
      if (left <= 0) {
        setPhase("over");
        void saveAttempt(setId, "speed", pointsRef.current, answeredRef.current);
        setRecord((r) => Math.max(r, pointsRef.current));
      }
    }, 100);
    return () => clearInterval(t);
  }, [phase, setId]);

  const choose = useCallback(
    (choice: string) => {
      if (phase !== "playing" || flash || !item) return;
      const good = choice === item.answer;
      setFlash({ choice, good });
      answeredRef.current += 1;
      setAnswered(answeredRef.current);
      if (good) {
        const s = streak + 1;
        pointsRef.current += 100 * streakMultiplier(s);
        setPoints(pointsRef.current);
        setStreak(s);
        setBestStreak((b) => Math.max(b, s));
        setCorrect((c) => c + 1);
      } else {
        setStreak(0);
      }
      setTimeout(
        () => {
          setFlash(null);
          // Reshuffle when the pool runs out so long rounds don't repeat in the same order.
          if ((index + 1) % pool.length === 0) setPool(buildSpeedPool(cards, questions));
          setIndex(index + 1);
        },
        good ? 250 : 900,
      );
    },
    [cards, flash, index, item, phase, pool.length, questions, streak],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const n = Number(e.key);
      if (item && n >= 1 && n <= item.choices.length) choose(item.choices[n - 1]);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choose, item]);

  if (!pool.length) {
    return <p className="panel text-muted">This set needs at least 4 flashcards or some multiple-choice questions to play.</p>;
  }

  if (phase === "ready") {
    return (
      <div className="panel py-10 text-center">
        <div className="text-5xl">⚡</div>
        <h2 className="mt-3 text-2xl font-extrabold">60 seconds. Go fast.</h2>
        <p className="mx-auto mt-2 max-w-sm text-muted">
          Answer as many as you can. Every 3 in a row raises your multiplier (up to ×4). A wrong answer resets it.
        </p>
        {best > 0 && <p className="mt-3 font-semibold text-good">Your best: {best} pts</p>}
        <button className="btn btn-primary mt-6 px-8 py-3 text-lg" onClick={start} autoFocus>
          Start
        </button>
      </div>
    );
  }

  if (phase === "over") {
    const newRecord = points > best && points > 0;
    return (
      <EndScreen
        setId={setId}
        headline={newRecord ? "New high score! 🏆" : "Time's up!"}
        score={`${points} pts`}
        detail={`${correct}/${answered} correct · best streak ${bestStreak}${!newRecord && record ? ` · high score ${record}` : ""}`}
        onReplay={start}
      />
    );
  }

  const mult = streakMultiplier(streak + 1);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="panel py-3">
          <div className={`text-2xl font-extrabold ${timeLeft < 10 ? "text-bad" : ""}`}>{Math.ceil(timeLeft)}s</div>
          <div className="text-xs text-muted">left</div>
        </div>
        <div className="panel py-3">
          <div key={points} className="pop text-2xl font-extrabold text-accent">{points}</div>
          <div className="text-xs text-muted">points</div>
        </div>
        <div className="panel py-3">
          <div className="text-2xl font-extrabold">{streak > 0 ? `🔥${streak}` : "–"}</div>
          <div className="text-xs text-muted">next ×{mult}</div>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-accent transition-[width] duration-100" style={{ width: `${(timeLeft / ROUND_SECONDS) * 100}%` }} />
      </div>

      <div className={`panel ${flash && !flash.good ? "shake" : ""}`}>
        <p className="text-lg font-bold leading-snug">{item.prompt}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {item.choices.map((c, i) => {
            const state = !flash
              ? "border-border"
              : c === item.answer
                ? "border-good bg-good-soft"
                : c === flash.choice
                  ? "border-bad bg-bad-soft"
                  : "border-border opacity-50";
            return (
              <button
                key={c}
                onClick={() => choose(c)}
                className={`flex items-center gap-3 rounded-xl border-2 px-4 py-3 text-left font-medium transition hover:border-accent ${state}`}
              >
                <span className="hidden h-6 w-6 shrink-0 place-items-center rounded-md bg-surface-2 text-xs font-bold sm:grid">{i + 1}</span>
                {c}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
