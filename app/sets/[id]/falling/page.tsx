import { GameShell } from "@/components/GameShell";
import { FallingWords } from "@/components/games/FallingWords";
import { loadSet } from "@/lib/sets";

export default async function FallingPage({ params }: { params: Promise<{ id: string }> }) {
  const set = await loadSet((await params).id);
  return (
    <GameShell set={set} title="Falling Words">
      <FallingWords setId={set.id} cards={set.cards} best={set.best.falling?.score ?? 0} />
    </GameShell>
  );
}
