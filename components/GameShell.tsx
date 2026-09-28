import Link from "next/link";
import type { LoadedSet } from "@/lib/sets";
import { ClientOnly } from "./ClientOnly";

export function GameShell({ set, title, children }: { set: LoadedSet; title: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link href={`/sets/${set.id}`} className="text-sm text-muted hover:text-text">
        ← {set.title}
      </Link>
      <h1 className="mb-5 mt-1 text-2xl font-extrabold">{title}</h1>
      <ClientOnly>{children}</ClientOnly>
    </div>
  );
}
