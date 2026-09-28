import { describe, expect, it } from "vitest";
import { buildSpeedPool, fallDuration, streakMultiplier } from "@/lib/games";
import { isCloseEnough, normalizeAnswer } from "@/lib/match";
import { StudySetSchema, normalizeStudySet, type StudySet } from "@/lib/schemas";
import { studyStreak } from "@/lib/stats";

describe("isCloseEnough", () => {
  it("ignores case, punctuation, accents and articles", () => {
    expect(normalizeAnswer("  The Mitochondria! ")).toBe("mitochondria");
    expect(isCloseEnough("mitochondria", "The Mitochondria")).toBe(true);
    expect(isCloseEnough("Pere", "Père")).toBe(true);
  });
  it("allows small typos on longer answers only", () => {
    expect(isCloseEnough("photosynthsis", "photosynthesis")).toBe(true);
    expect(isCloseEnough("cat", "car")).toBe(false);
    expect(isCloseEnough("respiration", "photosynthesis")).toBe(false);
  });
  it("requires numbers to match exactly", () => {
    expect(isCloseEnough("1493", "1492")).toBe(false);
    expect(isCloseEnough("1492", "1492")).toBe(true);
  });
  it("rejects blank guesses", () => {
    expect(isCloseEnough("  ", "anything")).toBe(false);
  });
});

describe("normalizeStudySet", () => {
  const raw: StudySet = {
    title: "  Cells ",
    subject: "Biology",
    cards: [
      { term: "Nucleus", definition: "Holds DNA" },
      { term: "nucleus", definition: "duplicate" },
      { term: "", definition: "no term" },
    ],
    questions: [
      { type: "mcq", prompt: "Which holds DNA?", choices: ["Nucleus", "Ribosome", "Nucleus", "Wall"], answer: "nucleus", explanation: "" },
      { type: "mcq", prompt: "Bad answer", choices: ["A", "B"], answer: "C", explanation: "" },
      { type: "true_false", prompt: "Cells are alive", choices: [], answer: "true", explanation: "" },
      { type: "true_false", prompt: "Weird", choices: [], answer: "maybe", explanation: "" },
      { type: "short", prompt: "Powerhouse?", choices: ["x"], answer: "Mitochondria", explanation: "" },
    ],
  };

  it("parses with the zod schema and drops malformed items", () => {
    const set = normalizeStudySet(StudySetSchema.parse(raw));
    expect(set.title).toBe("Cells");
    expect(set.cards).toEqual([{ term: "Nucleus", definition: "Holds DNA" }]);
    expect(set.questions.map((q) => q.prompt)).toEqual(["Which holds DNA?", "Cells are alive", "Powerhouse?"]);
    expect(set.questions[0]).toMatchObject({ choices: ["Nucleus", "Ribosome", "Wall"], answer: "Nucleus" });
    expect(set.questions[1]).toMatchObject({ choices: ["True", "False"], answer: "True" });
    expect(set.questions[2].choices).toEqual([]);
  });
});

describe("studyStreak", () => {
  const now = new Date(2026, 8, 28, 15);
  const day = (offset: number) => new Date(2026, 8, 28 + offset, 10);
  it("counts consecutive days ending today", () => {
    expect(studyStreak([day(0), day(-1), day(-2), day(-4)], now)).toBe(3);
  });
  it("keeps yesterday's streak alive before studying today", () => {
    expect(studyStreak([day(-1), day(-2)], now)).toBe(2);
  });
  it("is zero after a missed day", () => {
    expect(studyStreak([day(-2)], now)).toBe(0);
  });
});

describe("games", () => {
  const cards = ["A", "B", "C", "D", "E"].map((t) => ({ term: t, definition: `def ${t}` }));

  it("builds speed items from choice questions and cards", () => {
    const pool = buildSpeedPool(cards, [
      { type: "mcq", prompt: "q1", choices: ["1", "2", "3", "4"], answer: "2", explanation: "" },
      { type: "short", prompt: "q2", choices: [], answer: "x", explanation: "" },
    ]);
    expect(pool).toHaveLength(1 + cards.length);
    for (const item of pool) {
      expect(item.choices).toContain(item.answer);
      expect(new Set(item.choices).size).toBe(item.choices.length);
    }
  });

  it("skips card items when there are too few cards for 4 choices", () => {
    expect(buildSpeedPool(cards.slice(0, 3), [])).toEqual([]);
  });

  it("ramps the multiplier every 3 in a row, capped at x4", () => {
    expect([1, 3, 4, 6, 7, 10, 50].map(streakMultiplier)).toEqual([1, 1, 2, 2, 3, 4, 4]);
  });

  it("speeds up falling words with a floor", () => {
    expect(fallDuration(0)).toBe(14);
    expect(fallDuration(100)).toBe(4);
  });
});
