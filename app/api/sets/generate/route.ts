import { NextResponse } from "next/server";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaContentBlockParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { FALLBACK_BETAS, FALLBACKS, MODEL, aiErrorMessage, getAnthropic } from "@/lib/anthropic";
import { ExtractError, fileToContent } from "@/lib/extract";
import { GENERATOR_SYSTEM } from "@/lib/prompts";
import { StudySetSchema, normalizeStudySet } from "@/lib/schemas";
import { downloadUpload } from "@/lib/storage";
import { getUser } from "@/lib/supabase/server";

export const maxDuration = 300;

const Body = z.object({
  files: z.array(z.object({ path: z.string(), name: z.string() })).max(10).default([]),
  text: z.string().max(200_000).default(""),
});

export async function POST(request: Request) {
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { files, text } = parsed.data;
  if (!files.length && !text.trim()) {
    return NextResponse.json({ error: "Upload a file or paste some notes first." }, { status: 400 });
  }

  const content: BetaContentBlockParam[] = [];
  try {
    for (const f of files) content.push(...(await fileToContent(await downloadUpload(supabase, user.id, f.path), f.name)));
  } catch (e) {
    const message = e instanceof Error ? e.message : "Couldn't read that file.";
    return NextResponse.json({ error: message }, { status: e instanceof ExtractError ? 422 : 400 });
  }
  if (text.trim()) content.push({ type: "text", text: `<material filename="pasted notes">\n${text}\n</material>` });
  content.push({ type: "text", text: "Make a study set from the material above." });

  let set;
  try {
    const response = await getAnthropic().beta.messages.parse({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { effort: "medium", format: betaZodOutputFormat(StudySetSchema) },
      betas: FALLBACK_BETAS,
      fallbacks: FALLBACKS,
      system: GENERATOR_SYSTEM,
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "The AI couldn't make a study set from that material." }, { status: 422 });
    }
    if (!response.parsed_output) throw new Error(`No study set returned (stop reason: ${response.stop_reason}).`);
    set = normalizeStudySet(response.parsed_output);
  } catch (e) {
    return NextResponse.json({ error: aiErrorMessage(e) }, { status: 502 });
  }

  if (!set.cards.length && !set.questions.length) {
    return NextResponse.json({ error: "Couldn't find enough to study in that material." }, { status: 422 });
  }

  const { data: row, error } = await supabase
    .from("study_sets")
    .insert({ title: set.title, subject: set.subject, source_file_path: files[0]?.path ?? null })
    .select("id")
    .single();
  if (error || !row) return NextResponse.json({ error: "Couldn't save the study set." }, { status: 500 });

  const [cardsRes, questionsRes] = await Promise.all([
    set.cards.length
      ? supabase.from("cards").insert(set.cards.map((c, position) => ({ ...c, position, set_id: row.id })))
      : { error: null },
    set.questions.length
      ? supabase.from("questions").insert(set.questions.map((q, position) => ({ ...q, position, set_id: row.id })))
      : { error: null },
  ]);
  if (cardsRes.error || questionsRes.error) {
    await supabase.from("study_sets").delete().eq("id", row.id);
    return NextResponse.json({ error: "Couldn't save the study set." }, { status: 500 });
  }

  return NextResponse.json({ id: row.id });
}
