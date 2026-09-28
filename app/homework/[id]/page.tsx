import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { HomeworkChat } from "@/components/HomeworkChat";
import { BUCKET } from "@/lib/storage";
import { getUser } from "@/lib/supabase/server";

export default async function HomeworkSession({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) redirect(`/login?next=/homework/${id}`);

  const [{ data: hw }, { data: messages }] = await Promise.all([
    supabase.from("homework").select("id, mode, problem_text, image_path").eq("id", id).maybeSingle(),
    supabase.from("homework_messages").select("role, content").eq("homework_id", id).order("created_at"),
  ]);
  if (!hw) notFound();

  const imageUrl = hw.image_path
    ? (await supabase.storage.from(BUCKET).createSignedUrl(hw.image_path, 60 * 60)).data?.signedUrl ?? null
    : null;

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/homework" className="text-sm text-muted hover:text-text">
        ← New problem
      </Link>
      <HomeworkChat
        id={hw.id}
        initialMode={hw.mode}
        problem={hw.problem_text}
        imageUrl={imageUrl}
        initialMessages={(messages ?? []) as { role: "user" | "assistant"; content: string }[]}
      />
    </div>
  );
}
