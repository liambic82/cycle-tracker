import { PDFDocument, degrees, drawLinesOfText, rgb, type PDFFont } from 'pdf-lib';
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

// Each cache belongs to one export, never to the journal/session. Bound both
// entry count and retained text; long, mostly unique notes must not grow it.
function textCache<T>(calculate: (text: string) => T): (text: string) => T {
  const values = new Map<string, T>();
  let characters = 0;
  return (text) => {
    const cached = values.get(text);
    if (cached !== undefined) return cached;
    const value = calculate(text);
    if (text.length > 131072) return value;
    while (values.size >= 2048 || characters + text.length > 131072) {
      const oldest = values.keys().next().value!;
      characters -= oldest.length;
      values.delete(oldest);
    }
    values.set(text, value);
    characters += text.length;
    return value;
  };
}

type TextMeasurer = Pick<PDFFont, 'widthOfTextAtSize'>;
function measuredFont(font: PDFFont): TextMeasurer {
  // Keep whole-string shaping (ligatures/combining characters included).
  // Summing cached character or word widths can change line breaks.
  const measure = textCache((key: string) => {
    const separator = key.indexOf(':');
    return font.widthOfTextAtSize(key.slice(separator + 1), Number(key.slice(0, separator)));
  });
  return { widthOfTextAtSize: (text, size) => measure(`${size}:${text}`) };
}

export function wrapReportText(
  text: string,
  font: TextMeasurer,
  size: number,
  width: number,
): string[] {
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

function* layoutSteps(
  report: DoctorReport,
  regular: PDFFont,
  bold: PDFFont,
): Generator<void, PdfLayout> {
  const pages: PdfLine[][] = [];
  let page: PdfLine[],
    y = 0;
  const supported = new Set(regular.getCharacterSet());
  const regularMeasure = measuredFont(regular),
    boldMeasure = measuredFont(bold);
  const newPage = () => {
    if (pages.length >= 200)
      throw new Error('This PDF would be too long. Choose a shorter date range or fewer sections.');
    page = [];
    pages.push(page);
    y = HEIGHT - MARGIN;
    page.push({
      text: 'TRIFELLE / DOCTOR SUMMARY',
      x: MARGIN,
      y,
      size: 9,
      bold: true,
      muted: true,
    });
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
    for (const line of wrapReportText(
      text,
      strong ? boldMeasure : regularMeasure,
      size,
      WIDTH - 2 * MARGIN,
    )) {
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
  yield;
  for (const section of report.sections) {
    const explanationLines = wrapReportText(
      section.explanation,
      regularMeasure,
      9,
      WIDTH - 2 * MARGIN,
    ).length;
    ensure(60 + explanationLines * 13.05);
    write(section.title, 15, true, false, 5);
    write(section.explanation, 9, false, true, 10);
    if (!section.blocks.length)
      write('No selected records in this date range.', 10, false, true, 10);
    for (const block of section.blocks) {
      const headingLines = wrapReportText(
        block.heading,
        boldMeasure,
        10,
        WIDTH - 2 * MARGIN,
      ).length;
      ensure(headingLines * 14.5 + 24);
      write(block.heading, 10, true, false, 3);
      for (const paragraph of block.paragraphs) {
        write(paragraph);
        yield;
      }
      y -= 5;
      yield;
    }
    y -= 8;
    yield;
  }
  return { pages };
}

export function layoutReport(report: DoctorReport, regular: PDFFont, bold: PDFFont): PdfLayout {
  const steps = layoutSteps(report, regular, bold);
  let step = steps.next();
  while (!step.done) step = steps.next();
  return step.value;
}

export async function createReportPdf(
  report: DoctorReport,
  fonts: { regular: Uint8Array; bold: Uint8Array },
  isActive: () => boolean = () => true,
): Promise<Uint8Array> {
  let lastPause = Date.now();
  const checkpoint = async (force = false) => {
    if (!isActive()) throw new Error('Report export cancelled.');
    if (force || Date.now() - lastPause >= 16) {
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      lastPause = Date.now();
      if (!isActive()) throw new Error('Report export cancelled.');
    }
  };
  await checkpoint(true);
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle('Trifelle - Doctor summary');
  pdf.setAuthor('');
  pdf.setSubject('Selected journal records');
  pdf.setCreator('Trifelle');
  const regular = await pdf.embedFont(fonts.regular, { subset: true });
  const bold = await pdf.embedFont(fonts.bold, { subset: true });
  const steps = layoutSteps(report, regular, bold);
  let step = steps.next();
  while (!step.done) {
    await checkpoint();
    step = steps.next();
  }
  const layout = step.value;
  const encodeRegular = textCache((text) => regular.encodeText(text));
  const encodeBold = textCache((text) => bold.encodeText(text));
  for (const [index, lines] of layout.pages.entries()) {
    await checkpoint();
    const page = pdf.addPage([WIDTH, HEIGHT]);
    // Reuse two page font resources and already-shaped strings. drawText's
    // convenience path creates another resource and reshapes every repeated line.
    const regularKey = page.node.newFontDictionary(regular.name, regular.ref);
    const boldKey = page.node.newFontDictionary(bold.name, bold.ref);
    const draw = (line: PdfLine) =>
      page.pushOperators(
        ...drawLinesOfText([(line.bold ? encodeBold : encodeRegular)(line.text)], {
          x: line.x,
          y: line.y,
          size: line.size,
          font: line.bold ? boldKey : regularKey,
          color: line.muted ? MUTED : line.bold ? PLUM : INK,
          rotate: degrees(0),
          xSkew: degrees(0),
          ySkew: degrees(0),
          lineHeight: 24,
        }),
      );
    page.drawLine({
      start: { x: MARGIN, y: HEIGHT - MARGIN + 12 },
      end: { x: WIDTH - MARGIN, y: HEIGHT - MARGIN + 12 },
      color: PLUM,
      thickness: 2,
    });
    for (const line of lines) {
      if (line.text) draw(line);
      await checkpoint();
    }
    const footer = `${report.sample ? 'Fictional sample' : 'Private health information'} | ${report.from} to ${report.through}`;
    draw({ text: footer, x: MARGIN, y: 34, size: 8, bold: false, muted: true });
    const number = `${index + 1} / ${layout.pages.length}`;
    draw({
      text: number,
      x: WIDTH - MARGIN - regular.widthOfTextAtSize(number, 8),
      y: 34,
      size: 8,
      bold: false,
      muted: true,
    });
  }
  await checkpoint(true);
  const bytes = await pdf.save();
  await checkpoint(true);
  return bytes;
}
