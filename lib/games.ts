import { shuffle } from "@/lib/match";
import type { Card, Question } from "@/lib/schemas";

export type ChoiceItem = { prompt: string; choices: string[]; answer: string };

/**
 * Multiple-choice items for the Speed Round: the set's MCQ and true/false questions,
 * plus "which term matches this definition?" items built from the flashcards.
 */
export function buildSpeedPool(cards: Card[], questions: Question[]): ChoiceItem[] {
  const items: ChoiceItem[] = questions
    .filter((q) => q.type !== "short" && q.choices.includes(q.answer))
    .map((q) => ({ prompt: q.prompt, choices: q.type === "mcq" ? shuffle(q.choices) : q.choices, answer: q.answer }));

  if (cards.length >= 4) {
    for (const card of cards) {
      const others = shuffle(cards.filter((c) => c.term !== card.term)).slice(0, 3).map((c) => c.term);
      items.push({ prompt: card.definition, choices: shuffle([card.term, ...others]), answer: card.term });
    }
  }
  return shuffle(items);
}

/** Points multiplier for the current streak: x1 for the first 3 in a row, x2 for the next 3, up to x4. */
export function streakMultiplier(streak: number): number {
  return Math.min(4, 1 + Math.floor(Math.max(0, streak - 1) / 3));
}

/** Falling Words: seconds for a definition to reach the bottom, shrinking as the player scores. */
export function fallDuration(correctSoFar: number): number {
  return Math.max(4, 14 - correctSoFar * 0.6);
}
