import { GameShell } from "@/components/GameShell";
import { SpeedRound } from "@/components/games/SpeedRound";
import { loadSet } from "@/lib/sets";

export default async function SpeedPage({ params }: { params: Promise<{ id: string }> }) {
  const set = await loadSet((await params).id);
  return (
    <GameShell set={set} title="Speed Round">
      <SpeedRound setId={set.id} cards={set.cards} questions={set.questions} best={set.best.speed?.score ?? 0} />
    </GameShell>
  );
}
