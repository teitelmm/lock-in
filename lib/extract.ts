import JSZip from "jszip";
import mammoth from "mammoth";
import type {
  BetaContentBlockParam,
  BetaBase64ImageSource,
} from "@anthropic-ai/sdk/resources/beta/messages/messages";

export class ExtractError extends Error {}

// The API caps a request at 32 MB and base64 adds ~33%, so keep PDFs comfortably under that.
export const MAX_PDF_BYTES = 22 * 1024 * 1024;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const IMAGE_TYPES: Record<string, BetaBase64ImageSource["media_type"]> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

function extension(filename: string): string {
  return filename.toLowerCase().split(".").pop() ?? "";
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, "&");
}

/** Text of each <a:p> paragraph in a DrawingML part (slides and notes use the same markup). */
function drawingParagraphs(xml: string): string[] {
  const paragraphs: string[] = [];
  for (const p of xml.match(/<a:p[\s>][\s\S]*?<\/a:p>/g) ?? []) {
    const runs = [...p.matchAll(/<a:t(?:\s[^>]*)?>([\s\S]*?)<\/a:t>/g)].map((m) => decodeXml(m[1]));
    const text = runs.join("").trim();
    if (text) paragraphs.push(text);
  }
  return paragraphs;
}

const slideNumber = (path: string) => Number(path.match(/(\d+)\.xml$/)?.[1] ?? 0);

/** Slide text plus speaker notes, in slide order. */
export async function extractPptx(buffer: ArrayBuffer | Buffer): Promise<string> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(buffer);
  } catch {
    throw new ExtractError("That PowerPoint file couldn't be opened. Try re-saving it as .pptx or PDF.");
  }
  const slidePaths = Object.keys(zip.files)
    .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
    .sort((a, b) => slideNumber(a) - slideNumber(b));

  const sections: string[] = [];
  for (const [i, path] of slidePaths.entries()) {
    const slideText = drawingParagraphs(await zip.file(path)!.async("string"));

    // Notes are linked from the slide's relationships file, not by matching numbers.
    let notes: string[] = [];
    const rels = zip.file(path.replace("slides/", "slides/_rels/") + ".rels");
    const notesTarget = rels && (await rels.async("string")).match(/Target="\.\.\/notesSlides\/([^"]+)"/)?.[1];
    const notesFile = notesTarget && zip.file(`ppt/notesSlides/${notesTarget}`);
    if (notesFile) {
      // Drop the slide-number placeholder that notes pages carry.
      notes = drawingParagraphs(await notesFile.async("string")).filter((t) => !/^\d+$/.test(t));
    }

    if (!slideText.length && !notes.length) continue;
    let section = `## Slide ${i + 1}\n${slideText.join("\n")}`;
    if (notes.length) section += `\nSpeaker notes: ${notes.join(" ")}`;
    sections.push(section);
  }
  return sections.join("\n\n");
}

export async function extractDocx(buffer: Buffer): Promise<string> {
  try {
    const { value } = await mammoth.extractRawText({ buffer });
    return value.trim();
  } catch {
    throw new ExtractError("That Word file couldn't be opened. Try re-saving it as .docx or PDF.");
  }
}

/**
 * Turns an uploaded file into content blocks Claude can read.
 * PDFs and images go in natively; Office files are converted to text first.
 */
export async function fileToContent(buffer: Buffer, filename: string): Promise<BetaContentBlockParam[]> {
  const ext = extension(filename);

  if (ext === "pdf") {
    if (buffer.byteLength > MAX_PDF_BYTES) {
      throw new ExtractError("That PDF is over 22 MB. Split it into smaller parts and upload them one at a time.");
    }
    return [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: buffer.toString("base64") },
        title: filename,
      },
    ];
  }

  if (ext in IMAGE_TYPES) {
    if (buffer.byteLength > MAX_IMAGE_BYTES) {
      throw new ExtractError("That image is over 5 MB. Try a smaller photo or a screenshot.");
    }
    return [
      { type: "image", source: { type: "base64", media_type: IMAGE_TYPES[ext], data: buffer.toString("base64") } },
    ];
  }

  let text: string;
  if (ext === "pptx") text = await extractPptx(buffer);
  else if (ext === "docx") text = await extractDocx(buffer);
  else if (["txt", "md", "markdown", "csv", "rtf"].includes(ext)) text = buffer.toString("utf8");
  else if (ext === "ppt" || ext === "doc") {
    throw new ExtractError(`Old .${ext} files aren't supported. Open it and save as .${ext}x or PDF, then upload again.`);
  } else {
    throw new ExtractError("Unsupported file type. Upload a PowerPoint (.pptx), PDF, Word (.docx), text file, or photo.");
  }

  if (!text.trim()) {
    throw new ExtractError(
      "No text was found in that file. If the slides are mostly pictures, export them as a PDF and upload that instead.",
    );
  }
  return [{ type: "text", text: `<material filename="${filename}">\n${text}\n</material>` }];
}
