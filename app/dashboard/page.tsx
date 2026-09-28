import Link from "next/link";
import { redirect } from "next/navigation";
import { studyStreak } from "@/lib/stats";
import { getUser } from "@/lib/supabase/server";

export default async function Dashboard() {
  const { supabase, user } = await getUser();
  if (!user) redirect("/login");

  const [{ data: sets }, { data: attempts }, { data: homework }] = await Promise.all([
    supabase.from("study_sets").select("id, title, subject, created_at, cards(count), questions(count)").order("created_at", { ascending: false }),
    supabase.from("attempts").select("created_at").order("created_at", { ascending: false }).limit(500),
    supabase.from("homework").select("id, mode, problem_text, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const streak = studyStreak((attempts ?? []).map((a) => a.created_at));
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const thisWeek = (attempts ?? []).filter((a) => new Date(a.created_at).getTime() > weekAgo).length;

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Day streak" value={`${streak} 🔥`} />
        <Stat label="Sessions this week" value={String(thisWeek)} />
        <Stat label="Study sets" value={String(sets?.length ?? 0)} className="col-span-2 sm:col-span-1" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <Link href="/sets/new" className="panel group flex items-center gap-4 transition hover:border-accent">
          <span className="text-4xl">📤</span>
          <span>
            <span className="block text-lg font-bold group-hover:text-accent">New study set</span>
            <span className="text-muted">Upload slides or notes, get a quiz</span>
          </span>
        </Link>
        <Link href="/homework" className="panel group flex items-center gap-4 transition hover:border-accent">
          <span className="text-4xl">🧑‍🏫</span>
          <span>
            <span className="block text-lg font-bold group-hover:text-accent">Homework helper</span>
            <span className="text-muted">Tutor mode or steps + answer</span>
          </span>
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-xl font-bold">Your study sets</h2>
        {sets?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sets.map((s) => (
              <Link key={s.id} href={`/sets/${s.id}`} className="panel transition hover:border-accent">
                <div className="text-xs font-semibold uppercase tracking-wide text-accent">{s.subject || "Study set"}</div>
                <div className="mt-1 text-lg font-bold leading-snug">{s.title}</div>
                <div className="mt-2 text-sm text-muted">
                  {count(s.cards)} cards · {count(s.questions)} questions
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="panel text-muted">No study sets yet. Upload your first slides or notes to get started.</p>
        )}
      </section>

      {!!homework?.length && (
        <section>
          <h2 className="mb-3 text-xl font-bold">Recent homework</h2>
          <div className="space-y-2">
            {homework.map((h) => (
              <Link key={h.id} href={`/homework/${h.id}`} className="panel flex items-center gap-3 py-3 transition hover:border-accent">
                <span className="rounded-lg bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent">
                  {h.mode === "tutor" ? "Tutor" : "Solve"}
                </span>
                <span className="truncate">{h.problem_text || "Photo problem"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function count(rel: unknown): number {
  return Array.isArray(rel) ? (rel[0]?.count ?? 0) : 0;
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className={`panel ${className}`}>
      <div className="text-2xl font-extrabold sm:text-3xl">{value}</div>
      <div className="text-sm text-muted">{label}</div>
    </div>
  );
}
