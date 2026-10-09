import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { DoctorReport } from './report.ts';

const WIDTH = 612,
  HEIGHT = 792,
  MARGIN = 48,
  BOTTOM = 62;
const INK = rgb(0.15, 0.16, 0.17),
  PLUM = rgb(0.34, 0.22, 0.29),
  MUTED = rgb(0.36, 0.38, 0.4);
export type PdfLine = {
  text: string;
  x: number;
  y: number;
  size: number;
  bold: boolean;
  muted?: boolean;
};
export type PdfLayout = { pages: PdfLine[][] };
const clean = (text: string) => text.replace(/\r\n?/g, '\n').replace(/\t/g, '    ');

export function wrapReportText(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  for (const paragraph of clean(text).split('\n')) {
    if (!paragraph) {
      lines.push('');
      continue;
    }
    let line = '';
    // Split long words as well as prose; no text is silently clipped or truncated.
    for (const word of paragraph.split(/( +)/)) {
      if (font.widthOfTextAtSize(line + word, size) <= width) {
        line += word;
        continue;
      }
      if (line.trimEnd()) lines.push(line.trimEnd());
      line = '';
      if (!word.trim()) continue;
      for (const character of word) {
        if (font.widthOfTextAtSize(line + character, size) > width && line) {
          lines.push(line);
          line = '';
        }
        line += character;
      }
    }
    if (line) lines.push(line.trimEnd());
  }
  return lines;
}

export function layoutReport(report: DoctorReport, regular: PDFFont, bold: PDFFont): PdfLayout {
  const pages: PdfLine[][] = [];
  let page: PdfLine[],
    y = 0;
  const supported = new Set(regular.getCharacterSet());
  const newPage = () => {
    if (pages.length >= 200)
      throw new Error('This PDF would be too long. Choose a shorter date range or fewer sections.');
    page = [];
    pages.push(page);
    y = HEIGHT - MARGIN;
    page.push({ text: 'CYCLE / DOCTOR SUMMARY', x: MARGIN, y, size: 9, bold: true, muted: true });
    y -= 28;
  };
  const ensure = (height: number) => {
    if (y - height < BOTTOM) newPage();
  };
  const write = (text: string, size = 10, strong = false, muted = false, after = 6) => {
    for (const character of clean(text).replaceAll('\n', '')) {
      if (!supported.has(character.codePointAt(0)!))
        throw new Error(
          'This report contains a character the PDF font cannot display. Try excluding the affected section; your journal is unchanged. CSV export preserves the original text.',
        );
    }
    const lineHeight = size * 1.45;
    for (const line of wrapReportText(text, strong ? bold : regular, size, WIDTH - 2 * MARGIN)) {
      ensure(lineHeight);
      page!.push({ text: line, x: MARGIN, y, size, bold: strong, muted });
      y -= lineHeight;
    }
    y -= after;
  };
  newPage();
  write(report.sample ? 'Sample doctor summary' : 'Doctor summary', 25, true, false, 10);
  write(`${report.from} to ${report.through}`, 13, true);
  write(`Prepared ${report.generatedOn} | Patient-entered records`, 9, false, true, 12);
  write(
    report.sample
      ? 'FICTIONAL SAMPLE DATA - not a patient record.'
      : 'A summary of selected journal records for discussion. No diagnosis, predictions, or medication recommendations are included.',
    10,
    false,
    false,
    10,
  );
  write(`Included: ${report.included.join('; ')}.`, 9, false, true, 14);
  for (const section of report.sections) {
    const explanationLines = wrapReportText(
      section.explanation,
      regular,
      9,
      WIDTH - 2 * MARGIN,
    ).length;
    ensure(60 + explanationLines * 13.05);
    write(section.title, 15, true, false, 5);
    write(section.explanation, 9, false, true, 10);
    if (!section.blocks.length)
      write('No selected records in this date range.', 10, false, true, 10);
    for (const block of section.blocks) {
      const headingLines = wrapReportText(block.heading, bold, 10, WIDTH - 2 * MARGIN).length;
      ensure(headingLines * 14.5 + 24);
      write(block.heading, 10, true, false, 3);
      for (const paragraph of block.paragraphs) write(paragraph);
      y -= 5;
    }
    y -= 8;
  }
  return { pages };
}

export async function createReportPdf(
  report: DoctorReport,
  fonts: { regular: Uint8Array; bold: Uint8Array },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle('Cycle - Doctor summary');
  pdf.setAuthor('');
  pdf.setSubject('Selected journal records');
  pdf.setCreator('Cycle Tracker');
  const regular = await pdf.embedFont(fonts.regular, { subset: true });
  const bold = await pdf.embedFont(fonts.bold, { subset: true });
  const layout = layoutReport(report, regular, bold);
  for (const [index, lines] of layout.pages.entries()) {
    const page: PDFPage = pdf.addPage([WIDTH, HEIGHT]);
    page.drawLine({
      start: { x: MARGIN, y: HEIGHT - MARGIN + 12 },
      end: { x: WIDTH - MARGIN, y: HEIGHT - MARGIN + 12 },
      color: PLUM,
      thickness: 2,
    });
    for (const line of lines)
      if (line.text)
        page.drawText(line.text, {
          x: line.x,
          y: line.y,
          size: line.size,
          font: line.bold ? bold : regular,
          color: line.muted ? MUTED : line.bold ? PLUM : INK,
        });
    const footer = `${report.sample ? 'Fictional sample' : 'Private health information'} | ${report.from} to ${report.through}`;
    page.drawText(footer, { x: MARGIN, y: 34, size: 8, font: regular, color: MUTED });
    const number = `${index + 1} / ${layout.pages.length}`;
    page.drawText(number, {
      x: WIDTH - MARGIN - regular.widthOfTextAtSize(number, 8),
      y: 34,
      size: 8,
      font: regular,
      color: MUTED,
    });
  }
  return pdf.save();
}
