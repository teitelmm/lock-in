import { notFound, redirect } from "next/navigation";
import type { Card, Question } from "@/lib/schemas";
import { getUser } from "@/lib/supabase/server";

export type Mode = "quiz" | "flashcards" | "speed" | "falling";

export type LoadedSet = {
  id: string;
  title: string;
  subject: string;
  cards: Card[];
  questions: Question[];
  best: Partial<Record<Mode, { score: number; total: number }>>;
};

/** Loads a study set the signed-in user owns, with its cards, questions and best scores. */
export async function loadSet(id: string): Promise<LoadedSet> {
  const { supabase, user } = await getUser();
  if (!user) redirect(`/login?next=/sets/${id}`);

  const [{ data: set }, { data: cards }, { data: questions }, { data: attempts }] = await Promise.all([
    supabase.from("study_sets").select("id, title, subject").eq("id", id).maybeSingle(),
    supabase.from("cards").select("term, definition").eq("set_id", id).order("position"),
    supabase.from("questions").select("type, prompt, choices, answer, explanation").eq("set_id", id).order("position"),
    supabase.from("attempts").select("mode, score, total").eq("set_id", id),
  ]);
  if (!set) notFound();

  const best: LoadedSet["best"] = {};
  for (const a of attempts ?? []) {
    const mode = a.mode as Mode;
    if (!best[mode] || a.score > best[mode]!.score) best[mode] = { score: a.score, total: a.total };
  }
  return { ...set, cards: cards ?? [], questions: (questions ?? []) as Question[], best };
}
