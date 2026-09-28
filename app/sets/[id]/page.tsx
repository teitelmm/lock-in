import Link from "next/link";
import { DeleteSetButton } from "@/components/DeleteSetButton";
import { loadSet, type Mode } from "@/lib/sets";

const MODES: { mode: Mode; icon: string; title: string; body: string; needs: "cards" | "questions" | "either" }[] = [
  { mode: "quiz", icon: "📝", title: "Quiz", body: "Answer every question with instant feedback.", needs: "questions" },
  { mode: "flashcards", icon: "🃏", title: "Flashcards", body: "Flip, sort into know it / still learning.", needs: "cards" },
  { mode: "speed", icon: "⚡", title: "Speed Round", body: "60 seconds. Build a streak for bonus points.", needs: "either" },
  { mode: "falling", icon: "☄️", title: "Falling Words", body: "Type the term before the definition hits the ground.", needs: "cards" },
];

export default async function SetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const set = await loadSet(id);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-muted hover:text-text">← Dashboard</Link>
        <div className="mt-2 text-sm font-semibold uppercase tracking-wide text-accent">{set.subject || "Study set"}</div>
        <h1 className="text-3xl font-extrabold">{set.title}</h1>
        <p className="mt-1 text-muted">
          {set.cards.length} flashcards · {set.questions.length} quiz questions
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2">
        {MODES.map((m) => {
          const available =
            m.needs === "cards" ? set.cards.length > 0 : m.needs === "questions" ? set.questions.length > 0 : set.cards.length + set.questions.length > 0;
          const best = set.best[m.mode];
          const inner = (
            <>
              <span className="text-4xl">{m.icon}</span>
              <span className="min-w-0">
                <span className="block text-lg font-bold">{m.title}</span>
                <span className="block text-sm text-muted">{m.body}</span>
                {best && (
                  <span className="mt-1 block text-xs font-semibold text-good">
                    Best: {best.score}
                    {m.mode === "speed" ? " pts" : m.mode === "falling" ? " caught" : `/${best.total}`}
                  </span>
                )}
              </span>
            </>
          );
          return available ? (
            <Link key={m.mode} href={`/sets/${set.id}/${m.mode}`} className="panel flex items-center gap-4 transition hover:-translate-y-0.5 hover:border-accent">
              {inner}
            </Link>
          ) : (
            <div key={m.mode} className="panel flex items-center gap-4 opacity-50">{inner}</div>
          );
        })}
      </section>

      {set.cards.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-bold">Terms in this set</h2>
          <div className="panel divide-y divide-border p-0">
            {set.cards.map((c) => (
              <div key={c.term} className="grid gap-1 px-5 py-3 sm:grid-cols-[1fr_2fr] sm:gap-4">
                <div className="font-semibold">{c.term}</div>
                <div className="text-muted">{c.definition}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <DeleteSetButton id={set.id} />
    </div>
  );
}
