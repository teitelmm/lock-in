import { NextResponse } from "next/server";
import type { BetaContentBlockParam, BetaMessageParam } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";
import { FALLBACK_BETAS, FALLBACKS, MODEL, aiErrorMessage, getAnthropic } from "@/lib/anthropic";
import { ExtractError, fileToContent } from "@/lib/extract";
import { SOLVE_SYSTEM, TUTOR_SYSTEM } from "@/lib/prompts";
import { downloadUpload } from "@/lib/storage";
import { getUser } from "@/lib/supabase/server";

export const maxDuration = 300;

const Body = z.object({
  message: z.string().max(20_000).optional(),
  // Switching a tutor session to "solve" is the "just show me the answer" button.
  mode: z.enum(["tutor", "solve"]).optional(),
});

type Row = { role: "user" | "assistant"; content: string };

/** Streams the next assistant turn as plain text, then saves it. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await getUser();
  if (!user) return NextResponse.json({ error: "Please sign in again." }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const { data: hw } = await supabase.from("homework").select("*").eq("id", id).single();
  if (!hw) return NextResponse.json({ error: "Homework not found." }, { status: 404 });

  let mode: "tutor" | "solve" = hw.mode;
  if (parsed.data.mode && parsed.data.mode !== mode) {
    mode = parsed.data.mode;
    await supabase.from("homework").update({ mode }).eq("id", id);
  }

  const userMessage = parsed.data.message?.trim();
  if (userMessage) {
    const { error } = await supabase.from("homework_messages").insert({ homework_id: id, role: "user", content: userMessage });
    if (error) return NextResponse.json({ error: "Couldn't save your message." }, { status: 500 });
  }

  const { data: history } = await supabase
    .from("homework_messages")
    .select("role, content")
    .eq("homework_id", id)
    .order("created_at");

  // The problem itself (photo + typed text) is always the first user turn.
  const problem: BetaContentBlockParam[] = [];
  try {
    if (hw.image_path) {
      const name = hw.image_path.split("/").pop() ?? "photo.jpg";
      problem.push(...(await fileToContent(await downloadUpload(supabase, user.id, hw.image_path), name)));
    }
  } catch (e) {
    const message = e instanceof ExtractError ? e.message : "Couldn't read the homework photo.";
    return NextResponse.json({ error: message }, { status: 422 });
  }
  problem.push({ type: "text", text: hw.problem_text?.trim() || "Here is my homework problem (see the photo)." });

  const messages = buildMessages(problem, (history ?? []) as Row[]);

  const client = getAnthropic();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let text = "";
      try {
        const aiStream = client.beta.messages.stream({
          model: MODEL,
          max_tokens: 32000,
          thinking: { type: "adaptive" },
          output_config: { effort: mode === "solve" ? "high" : "medium" },
          betas: FALLBACK_BETAS,
          fallbacks: FALLBACKS,
          system: mode === "solve" ? SOLVE_SYSTEM : TUTOR_SYSTEM,
          messages,
        });
        for await (const event of aiStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            text += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await aiStream.finalMessage();
        if (final.stop_reason === "refusal" && !text) {
          text = "Sorry, I can't help with that one. Try rewording the problem.";
          controller.enqueue(encoder.encode(text));
        }
        if (text) await supabase.from("homework_messages").insert({ homework_id: id, role: "assistant", content: text });
      } catch (e) {
        controller.enqueue(encoder.encode(`${text ? "\n\n" : ""}⚠️ ${aiErrorMessage(e)}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Mode": mode },
  });
}

/**
 * Text-only, strictly alternating history. Merges back-to-back turns from the same role
 * (for example if an earlier reply failed after the student's message was saved).
 */
function buildMessages(problem: BetaContentBlockParam[], history: Row[]): BetaMessageParam[] {
  const messages: BetaMessageParam[] = [{ role: "user", content: [...problem] }];
  for (const row of history) {
    const last = messages[messages.length - 1];
    if (last.role === row.role) {
      (last.content as BetaContentBlockParam[]).push({ type: "text", text: row.content });
    } else {
      messages.push({ role: row.role, content: [{ type: "text", text: row.content }] });
    }
  }
  // A request must end on a user turn: if the student pressed "reply" with nothing new, ask to continue.
  if (messages[messages.length - 1].role === "assistant") {
    messages.push({ role: "user", content: [{ type: "text", text: "Please continue." }] });
  }
  return messages;
}
