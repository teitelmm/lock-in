import type { SupabaseClient } from "@supabase/supabase-js";

export const BUCKET = "uploads";

/** Downloads a file the signed-in user uploaded. RLS stops anyone reading another user's folder. */
export async function downloadUpload(supabase: SupabaseClient, userId: string, path: string): Promise<Buffer> {
  if (!path.startsWith(`${userId}/`)) throw new Error("That file doesn't belong to you.");
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) throw new Error("Couldn't read the uploaded file. Try uploading it again.");
  return Buffer.from(await data.arrayBuffer());
}
