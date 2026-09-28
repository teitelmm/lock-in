"use client";

import { useEffect, useRef, useState } from "react";
import { saveAttempt } from "@/lib/attempts";
import { fallDuration } from "@/lib/games";
import { isCloseEnough, shuffle } from "@/lib/match";
import type { Card } from "@/lib/schemas";
import { EndScreen } from "./EndScreen";

const LIVES = 3;

export function FallingWords({ setId, cards, best }: { setId: string; cards: Card[]; best: number }) {
  const [phase, setPhase] = useState<"ready" | "playing" | "over">("ready");
  const [card, setCard] = useState<Card | null>(null);
  const [lives, setLives] = useState(LIVES);
  const [caught, setCaught] = useState(0);
  const [missed, setMissed] = useState<Card[]>([]);
  const [reveal, setReveal] = useState<Card | null>(null);
  const [typed, setTyped] = useState("");
  const [wrong, setWrong] = useState(false);
  const [left, setLeft] = useState(10);

  const areaRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const deck = useRef<Card[]>([]);
  const dropStart = useRef(0);
  const caughtRef = useRef(0);
  const livesRef = useRef(LIVES);
  const missedRef = useRef<Card[]>([]);

  function drawCard() {
    if (!deck.current.length) deck.current = shuffle(cards);
    const next = deck.current.pop()!;
    setCard(next);
    setTyped("");
    setLeft(5 + Math.random() * 35);
    dropStart.current = performance.now();
  }

  function start() {
    deck.current = shuffle(cards);
    caughtRef.current = 0;
    livesRef.current = LIVES;
    missedRef.current = [];
    setCaught(0);
    setLives(LIVES);
    setMissed([]);
    setReveal(null);
    setPhase("playing");
    drawCard();
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // Animation loop: moves the falling box and detects when it hits the ground.
  useEffect(() => {
    if (phase !== "playing" || reveal || !card) return;
    let frame = 0;
    const tick = (now: number) => {
      const area = areaRef.current;
      const box = boxRef.current;
      if (!area || !box) return;
      const progress = (now - dropStart.current) / 1000 / fallDuration(caughtRef.current);
      const maxY = area.clientHeight - box.offsetHeight - 8;
      box.style.transform = `translateY(${Math.min(progress, 1) * maxY}px)`;
      if (progress >= 1) {
        livesRef.current -= 1;
        missedRef.current = [...missedRef.current, card];
        setLives(livesRef.current);
        setMissed(missedRef.current);
        setReveal(card);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase, reveal, card]);

  // After a miss, show the answer briefly, then continue or end the game.
  useEffect(() => {
    if (!reveal) return;
    const t = setTimeout(() => {
      setReveal(null);
      if (livesRef.current <= 0) {
        setPhase("over");
        void saveAttempt(setId, "falling", caughtRef.current, caughtRef.current + missedRef.current.length);
      } else {
        drawCard();
        inputRef.current?.focus();
      }
    }, 1800);
    return () => clearTimeout(t);
    // drawCard only touches refs and setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reveal, setId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!card || reveal || !typed.trim()) return;
    if (isCloseEnough(typed, card.term)) {
      caughtRef.current += 1;
      setCaught(caughtRef.current);
      drawCard();
    } else {
      setWrong(true);
      setTyped("");
      setTimeout(() => setWrong(false), 500);
    }
  }

  if (!cards.length) return <p className="panel text-muted">This set has no flashcards to play with.</p>;

  if (phase === "ready") {
    return (
      <div className="panel py-10 text-center">
        <div className="text-5xl">☄️</div>
        <h2 className="mt-3 text-2xl font-extrabold">Type the term before it lands</h2>
        <p className="mx-auto mt-2 max-w-sm text-muted">
          A definition falls from the sky. Type the matching term and press Enter. Small typos are OK. It gets faster as
          you go, and you have {LIVES} lives.
        </p>
        {best > 0 && <p className="mt-3 font-semibold text-good">Your best: {best} caught</p>}
        <button className="btn btn-primary mt-6 px-8 py-3 text-lg" onClick={start} autoFocus>
          Start
        </button>
      </div>
    );
  }

  if (phase === "over") {
    return (
      <EndScreen
        setId={setId}
        headline={caught > best && caught > 0 ? "New high score! 🏆" : "Game over"}
        score={`${caught} caught`}
        detail={best > 0 && caught <= best ? `Your best: ${best}` : undefined}
        onReplay={start}
      >
        {missed.length > 0 && (
          <div className="panel space-y-3">
            <h2 className="font-bold">The ones that got away</h2>
            {missed.map((c, i) => (
              <div key={i} className="grid gap-1 border-t border-border pt-3 first:border-0 first:pt-0 sm:grid-cols-[1fr_2fr] sm:gap-4">
                <div className="font-semibold text-good">{c.term}</div>
                <div className="text-sm text-muted">{c.definition}</div>
              </div>
            ))}
          </div>
        )}
      </EndScreen>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">
          Caught: <span className="text-accent">{caught}</span>
        </span>
        <span className="text-xl" aria-label={`${lives} lives left`}>
          {"❤️".repeat(Math.max(lives, 0))}
          <span className="opacity-25">{"🖤".repeat(LIVES - Math.max(lives, 0))}</span>
        </span>
      </div>

      <div
        ref={areaRef}
        className="relative h-[380px] overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-accent-soft to-surface sm:h-[440px]"
      >
        {card && !reveal && (
          <div
            key={`${card.term}-${caught}-${lives}`}
            ref={boxRef}
            className="absolute top-2 w-[55%] rounded-xl border border-accent bg-surface p-3 text-sm font-medium shadow-lg sm:text-base"
            style={{ left: `${left}%` }}
          >
            <p className="line-clamp-4">{card.definition}</p>
          </div>
        )}
        {reveal && (
          <div className="absolute inset-0 grid place-items-center bg-bad-soft/90 p-6 text-center">
            <div>
              <div className="text-sm font-semibold text-bad">Missed! It was</div>
              <div className="pop mt-1 text-3xl font-extrabold">{reveal.term}</div>
            </div>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-2 bg-bad/40" />
      </div>

      <form onSubmit={submit} className="flex gap-2">
        <input
          ref={inputRef}
          className={`input text-lg ${wrong ? "shake border-bad" : ""}`}
          placeholder="Type the term…"
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <button className="btn btn-primary">Enter</button>
      </form>
    </div>
  );
}
