import { GameShell } from "@/components/GameShell";
import { QuizRunner } from "@/components/games/QuizRunner";
import { loadSet } from "@/lib/sets";

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const set = await loadSet((await params).id);
  return (
    <GameShell set={set} title="Quiz">
      <QuizRunner setId={set.id} questions={set.questions} />
    </GameShell>
  );
}
