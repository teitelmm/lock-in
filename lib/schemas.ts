import { z } from "zod";

export const CardSchema = z.object({
  term: z.string().describe("A key term, name, date, or concept, as short as possible"),
  definition: z.string().describe("A clear one- or two-sentence definition or explanation"),
});

export const QuestionSchema = z.object({
  type: z.enum(["mcq", "true_false", "short"]),
  prompt: z.string(),
  choices: z
    .array(z.string())
    .describe("mcq: exactly 4 options. true_false: [\"True\", \"False\"]. short: empty array"),
  answer: z.string().describe("For mcq and true_false, copied exactly from choices"),
  explanation: z.string().describe("One or two sentences on why the answer is right"),
});

export const StudySetSchema = z.object({
  title: z.string(),
  subject: z.string(),
  cards: z.array(CardSchema),
  questions: z.array(QuestionSchema),
});

export type Card = z.infer<typeof CardSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export type StudySet = z.infer<typeof StudySetSchema>;

const clean = (s: string) => s.trim().replace(/\s+/g, " ");

/**
 * Drops malformed items the model can still produce inside a valid schema:
 * empty cards, MCQs whose answer is not one of the choices, duplicate choices, etc.
 */
export function normalizeStudySet(set: StudySet): StudySet {
  const seenTerms = new Set<string>();
  const cards = set.cards
    .map((c) => ({ term: clean(c.term), definition: clean(c.definition) }))
    .filter((c) => {
      const key = c.term.toLowerCase();
      if (!c.term || !c.definition || seenTerms.has(key)) return false;
      seenTerms.add(key);
      return true;
    });

  const questions: Question[] = [];
  for (const q of set.questions) {
    const prompt = clean(q.prompt);
    const explanation = clean(q.explanation);
    let answer = clean(q.answer);
    if (!prompt || !answer) continue;

    if (q.type === "short") {
      questions.push({ type: "short", prompt, choices: [], answer, explanation });
      continue;
    }
    if (q.type === "true_false") {
      const a = answer.toLowerCase();
      if (a !== "true" && a !== "false") continue;
      answer = a === "true" ? "True" : "False";
      questions.push({ type: "true_false", prompt, choices: ["True", "False"], answer, explanation });
      continue;
    }
    const choices = [...new Set(q.choices.map(clean).filter(Boolean))];
    const match = choices.find((c) => c.toLowerCase() === answer.toLowerCase());
    if (!match || choices.length < 2) continue;
    questions.push({ type: "mcq", prompt, choices, answer: match, explanation });
  }

  return { title: clean(set.title) || "Untitled set", subject: clean(set.subject), cards, questions };
}
