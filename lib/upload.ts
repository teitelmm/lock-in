"use client";

import { createClient } from "@/lib/supabase/client";

const IMAGE_MAX_SIDE = 2000;

/** Shrinks big phone photos (and converts HEIC etc. where the browser can) to a JPEG under the API limit. */
async function prepareImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  if (file.size < 1.5 * 1024 * 1024 && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, IMAGE_MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.85));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Uploads straight to Supabase Storage (skipping server body-size limits). Returns the storage path. */
export async function uploadFile(file: File): Promise<{ path: string; name: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in again.");

  const prepared = await prepareImage(file);
  const safeName = prepared.name.replace(/[^\w.\-]+/g, "_").slice(-100);
  const path = `${user.id}/${crypto.randomUUID()}-${safeName}`;
  const { error } = await supabase.storage.from("uploads").upload(path, prepared, { contentType: prepared.type || undefined });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  return { path, name: prepared.name };
}
