import { describe, expect, it } from "vitest";
import { ExtractError, MAX_PDF_BYTES, extractPptx, fileToContent } from "@/lib/extract";
import { makeDocx, makePptx } from "./fixtures";

describe("extractPptx", () => {
  it("reads slides in numeric order with their own speaker notes", async () => {
    const slides = Array.from({ length: 11 }, (_, i) => ({ text: [`Slide title ${i + 1}`], notes: [`Note for ${i + 1}`] }));
    const text = await extractPptx(await makePptx(slides));
    const order = [...text.matchAll(/Slide title (\d+)/g)].map((m) => Number(m[1]));
    expect(order).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(text).toContain("## Slide 2\nSlide title 2\nSpeaker notes: Note for 2");
    // The slide-number placeholder on notes pages is dropped.
    expect(text).not.toMatch(/Speaker notes: Note for 2 2/);
  });

  it("decodes XML entities", async () => {
    const text = await extractPptx(await makePptx([{ text: ["Salt &amp; pepper &lt;3 &#233;"] }]));
    expect(text).toContain("Salt & pepper <3 é");
  });

  it("rejects files that are not zip archives", async () => {
    await expect(extractPptx(Buffer.from("not a pptx"))).rejects.toBeInstanceOf(ExtractError);
  });
});

describe("fileToContent", () => {
  it("wraps pptx text in a material block", async () => {
    const blocks = await fileToContent(await makePptx([{ text: ["Mitochondria", "Powerhouse of the cell"] }]), "bio.pptx");
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toMatchObject({ type: "text" });
    expect((blocks[0] as { text: string }).text).toContain('<material filename="bio.pptx">');
    expect((blocks[0] as { text: string }).text).toContain("Powerhouse of the cell");
  });

  it("reads docx text", async () => {
    const blocks = await fileToContent(await makeDocx(["Photosynthesis makes glucose.", "It happens in chloroplasts."]), "notes.docx");
    expect((blocks[0] as { text: string }).text).toContain("It happens in chloroplasts.");
  });

  it("passes PDFs and images through natively", async () => {
    const [pdf] = await fileToContent(Buffer.from("%PDF-1.4"), "unit.PDF");
    expect(pdf).toMatchObject({ type: "document", source: { type: "base64", media_type: "application/pdf" } });
    const [img] = await fileToContent(Buffer.from([0xff, 0xd8]), "photo.jpeg");
    expect(img).toMatchObject({ type: "image", source: { media_type: "image/jpeg" } });
  });

  it("gives clear errors for unsupported, old, empty, or oversized files", async () => {
    await expect(fileToContent(Buffer.from("x"), "deck.ppt")).rejects.toThrow(/save as \.pptx/);
    await expect(fileToContent(Buffer.from("x"), "song.mp3")).rejects.toThrow(/Unsupported/);
    await expect(fileToContent(await makePptx([{ text: [] }]), "pics.pptx")).rejects.toThrow(/No text/);
    await expect(fileToContent(Buffer.alloc(MAX_PDF_BYTES + 1), "big.pdf")).rejects.toThrow(/over 22 MB/);
  });
});
