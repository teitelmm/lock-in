"use client";

import { useCallback, useEffect, useState } from "react";
import { saveAttempt } from "@/lib/attempts";
import { shuffle } from "@/lib/match";
import type { Card } from "@/lib/schemas";
import { EndScreen, cheer } from "./EndScreen";

export function Flashcards({ setId, cards }: { setId: string; cards: Card[] }) {
  const [deck, setDeck] = useState(() => shuffle(cards));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [termFirst, setTermFirst] = useState(true);
  const [known, setKnown] = useState<Card[]>([]);
  const [learning, setLearning] = useState<Card[]>([]);
  const [round, setRound] = useState(1);

  const done = index >= deck.length;
  const card = deck[index];

  const mark = useCallback(
    (knowIt: boolean) => {
      if (done) return;
      const nextKnown = knowIt ? [...known, card] : known;
      const nextLearning = knowIt ? learning : [...learning, card];
      setKnown(nextKnown);
      setLearning(nextLearning);
      setFlipped(false);
      setIndex(index + 1);
      if (index + 1 >= deck.length && round === 1) void saveAttempt(setId, "flashcards", nextKnown.length, deck.length);
    },
    [card, deck.length, done, index, known, learning, round, setId],
  );

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (done || (e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === "ArrowRight") mark(true);
      else if (e.key === "ArrowLeft") mark(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, mark]);

  function restart(next: Card[], nextRound: number) {
    setDeck(shuffle(next));
    setIndex(0);
    setFlipped(false);
    setKnown([]);
    setLearning([]);
    setRound(nextRound);
  }

  if (done) {
    return (
      <EndScreen
        setId={setId}
        headline={learning.length ? cheer(known.length / deck.length) : "You know every card 🔒"}
        score={`${known.length}/${deck.length}`}
        detail={learning.length ? `${learning.length} still learning` : "Nothing left to review"}
        onReplay={() => restart(cards, 1)}
        replayLabel="Start over"
        extraAction={
          learning.length > 0 && (
            <button className="btn btn-primary" onClick={() => restart(learning, round + 1)}>
              Study the {learning.length} I&apos;m still learning
            </button>
          )
        }
      />
    );
  }

  const front = termFirst ? card.term : card.definition;
  const back = termFirst ? card.definition : card.term;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>
          {round > 1 && `Round ${round} · `}Card {index + 1} of {deck.length}
        </span>
        <button className="rounded-lg px-2 py-1 hover:bg-surface-2" onClick={() => setTermFirst(!termFirst)}>
          Show {termFirst ? "definition" : "term"} first ⇄
        </button>
      </div>

      <button
        className={`flip-card block h-72 w-full sm:h-80 ${flipped ? "flipped" : ""}`}
        onClick={() => setFlipped(!flipped)}
        aria-label="Flip card"
      >
        <div className="flip-inner relative h-full w-full">
          <div className="flip-face panel absolute inset-0 grid place-items-center overflow-auto p-8">
            <p className={`${termFirst ? "text-3xl font-extrabold" : "text-lg"} leading-snug`}>{front}</p>
          </div>
          <div className="flip-face flip-back panel absolute inset-0 grid place-items-center overflow-auto border-accent bg-accent-soft p-8">
            <p className={`${termFirst ? "text-lg" : "text-3xl font-extrabold"} leading-snug`}>{back}</p>
          </div>
        </div>
      </button>
      <p className="text-center text-xs text-muted">Tap the card to flip · keyboard: space to flip, ← still learning, → know it</p>

      <div className="grid grid-cols-2 gap-3">
        <button className="btn border-bad/40 py-3 text-bad" onClick={() => mark(false)}>
          ✗ Still learning
        </button>
        <button className="btn border-good/40 py-3 text-good" onClick={() => mark(true)}>
          ✓ Know it
        </button>
      </div>

      <div className="flex justify-center gap-6 text-sm">
        <span className="text-bad">Still learning: {learning.length}</span>
        <span className="text-good">Know it: {known.length}</span>
      </div>
    </div>
  );
}
