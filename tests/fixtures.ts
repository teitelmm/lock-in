import JSZip from "jszip";

const drawingText = (paragraphs: string[]) =>
  paragraphs.map((p) => `<a:p><a:r><a:rPr lang="en-US"/><a:t>${p}</a:t></a:r></a:p>`).join("");

/** A minimal .pptx: just the parts the extractor reads (slides, slide rels, notes). */
export async function makePptx(slides: { text: string[]; notes?: string[] }[]): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>`);
  slides.forEach((s, i) => {
    const n = i + 1;
    zip.file(
      `ppt/slides/slide${n}.xml`,
      `<p:sld xmlns:a="a" xmlns:p="p"><p:cSld><p:spTree><p:sp><p:txBody>${drawingText(s.text)}</p:txBody></p:sp></p:spTree></p:cSld></p:sld>`,
    );
    if (s.notes) {
      // Notes numbering deliberately differs from slide numbering, like real decks after reordering.
      const notesName = `notesSlide${slides.length - i}.xml`;
      zip.file(
        `ppt/slides/_rels/slide${n}.xml.rels`,
        `<Relationships><Relationship Id="rId2" Type="notesSlide" Target="../notesSlides/${notesName}"/></Relationships>`,
      );
      zip.file(`ppt/notesSlides/${notesName}`, `<p:notes xmlns:a="a" xmlns:p="p">${drawingText([...s.notes, String(n)])}</p:notes>`);
    }
  });
  return zip.generateAsync({ type: "nodebuffer" });
}

/** A minimal but valid .docx that mammoth can read. */
export async function makeDocx(paragraphs: string[]): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`,
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs
      .map((p) => `<w:p><w:r><w:t>${p}</w:t></w:r></w:p>`)
      .join("")}</w:body></w:document>`,
  );
  return zip.generateAsync({ type: "nodebuffer" });
}
