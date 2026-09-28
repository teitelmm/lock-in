import Anthropic from "@anthropic-ai/sdk";
import type { AnthropicBeta } from "@anthropic-ai/sdk/resources/beta/beta";

export const MODEL = "claude-opus-5-5";

// Server-side refusal fallback: if the main model declines a request, the API
// retries it on a suitable fallback model instead of returning an empty answer.
export const FALLBACK_BETAS: AnthropicBeta[] = ["server-side-fallback-2026-07-01"];
export const FALLBACKS = "default" as const;

let client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set. Add it to .env.local (see README).");
  }
  client ??= new Anthropic();
  return client;
}

/** A message a student can act on, for any error thrown while calling Claude. */
export function aiErrorMessage(e: unknown): string {
  if (e instanceof Anthropic.RateLimitError) return "The AI is busy right now. Wait a minute and try again.";
  if (e instanceof Anthropic.BadRequestError) {
    if (/too long|too large|exceed/i.test(e.message)) return "That material is too big to process at once. Try splitting it up.";
    return "The AI couldn't read that material. Try a different file format.";
  }
  if (e instanceof Anthropic.AuthenticationError) return "The AI key isn't set up correctly (check ANTHROPIC_API_KEY).";
  if (e instanceof Anthropic.APIError) return "The AI service had a problem. Try again in a moment.";
  if (e instanceof Error && e.message.includes("ANTHROPIC_API_KEY")) return e.message;
  return "Something went wrong. Try again.";
}
