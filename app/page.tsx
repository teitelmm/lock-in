import Link from "next/link";
import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/SetupNotice";
import { getUser, isSupabaseConfigured } from "@/lib/supabase/server";

const FEATURES = [
  { icon: "📤", title: "Drop in your slides or notes", body: "PowerPoints, PDFs, Word docs, photos of your notebook, or just paste text." },
  { icon: "🧠", title: "Get a study set in seconds", body: "Flashcards and a practice quiz built only from what your teacher gave you." },
  { icon: "🎮", title: "Study by playing", body: "Flashcards, a 60-second Speed Round, and Falling Words. Or take the quiz straight." },
  { icon: "🧑‍🏫", title: "Homework helper", body: "Snap a photo. Get a tutor that walks you through it, or the steps and the answer." },
];

export default async function Home() {
  const configured = isSupabaseConfigured();
  if (configured && (await getUser()).user) redirect("/dashboard");

  return (
    <div className="space-y-10">
      {!configured && <SetupNotice />}
      <section className="pt-4 text-center sm:pt-10">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
          Study less time.
          <br />
          <span className="text-accent">Remember more.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-muted">
          Upload your class notes and Lock In turns them into quizzes and quick games. Stuck on homework? Get a tutor or
          the full solution.
        </p>
        <Link href="/login" className="btn btn-primary mt-8 px-6 py-3 text-lg">
          Start locking in →
        </Link>
      </section>
      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="panel">
            <div className="text-3xl">{f.icon}</div>
            <h3 className="mt-2 text-lg font-bold">{f.title}</h3>
            <p className="mt-1 text-muted">{f.body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
