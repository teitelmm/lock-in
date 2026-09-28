import { GameShell } from "@/components/GameShell";
import { Flashcards } from "@/components/games/Flashcards";
import { loadSet } from "@/lib/sets";

export default async function FlashcardsPage({ params }: { params: Promise<{ id: string }> }) {
  const set = await loadSet((await params).id);
  return (
    <GameShell set={set} title="Flashcards">
      <Flashcards setId={set.id} cards={set.cards} />
    </GameShell>
  );
}
