import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import type { Report, ReportLine } from "./admin-data";
import { strings } from "./strings";

/**
 * The report as a page the society can print, file or send on.
 *
 * Drawn rather than rendered from a browser, because the live site runs on a
 * machine that has no browser to open. Counts and shares only: nothing that
 * reaches this file can name a person or a choice.
 */

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 48;
const INK = rgb(0.08, 0.11, 0.09);
const SOFT = rgb(0.42, 0.46, 0.43);
const BRAND = rgb(0.09, 0.38, 0.22);
const RULE = rgb(0.85, 0.87, 0.85);
const TRACK = rgb(0.92, 0.94, 0.92);

type Ctx = {
  doc: PDFDocument;
  page: PDFPage;
  y: number;
  regular: PDFFont;
  bold: PDFFont;
};

function newPage(ctx: Ctx): void {
  ctx.page = ctx.doc.addPage(A4);
  ctx.y = A4[1] - MARGIN;
}

/** Starts a fresh page when the next block would run off the bottom. */
function room(ctx: Ctx, needed: number): void {
  if (ctx.y - needed < MARGIN + 40) newPage(ctx);
}

function text(
  ctx: Ctx,
  value: string,
  opts: { size?: number; font?: PDFFont; color?: typeof INK; x?: number } = {},
): void {
  ctx.page.drawText(value, {
    x: opts.x ?? MARGIN,
    y: ctx.y,
    size: opts.size ?? 10,
    font: opts.font ?? ctx.regular,
    color: opts.color ?? INK,
  });
}

/** Right aligned, so the counts line up in a column of their own. */
function rightText(
  ctx: Ctx,
  value: string,
  right: number,
  opts: { size?: number; font?: PDFFont; color?: typeof INK } = {},
): void {
  const font = opts.font ?? ctx.regular;
  const size = opts.size ?? 10;
  ctx.page.drawText(value, {
    x: right - font.widthOfTextAtSize(value, size),
    y: ctx.y,
    size,
    font,
    color: opts.color ?? INK,
  });
}

function block(ctx: Ctx, title: string, rows: ReportLine[]): void {
  if (rows.length === 0) return;
  room(ctx, 40 + rows.length * 26);

  ctx.y -= 22;
  text(ctx, title.toUpperCase(), { size: 9, font: ctx.bold, color: SOFT });
  ctx.y -= 6;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: A4[0] - MARGIN, y: ctx.y },
    thickness: 1,
    color: RULE,
  });
  ctx.y -= 16;

  const right = A4[0] - MARGIN;
  for (const row of rows) {
    room(ctx, 30);
    text(ctx, row.label, { size: 10.5 });

    const count = String(row.count);
    const share =
      row.percent === null ? "" : `${row.percent}% ${strings.admin.reportOutOf(row.outOf)}`;
    if (share) {
      rightText(ctx, share, right, { size: 9, color: SOFT });
      rightText(ctx, count, right - ctx.regular.widthOfTextAtSize(share, 9) - 8, {
        size: 11,
        font: ctx.bold,
      });
    } else {
      rightText(ctx, count, right, { size: 11, font: ctx.bold });
    }

    if (row.percent !== null) {
      ctx.y -= 7;
      const width = A4[0] - MARGIN * 2;
      ctx.page.drawRectangle({
        x: MARGIN, y: ctx.y, width, height: 4, color: TRACK,
      });
      ctx.page.drawRectangle({
        x: MARGIN,
        y: ctx.y,
        width: (width * Math.min(100, Math.max(0, row.percent))) / 100,
        height: 4,
        color: BRAND,
      });
      ctx.y -= 19;
    } else {
      ctx.y -= 22;
    }
  }
}

export async function reportPdf(report: Report, when: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = { doc, page: doc.addPage(A4), y: A4[1] - MARGIN, regular, bold };

  doc.setTitle(`${strings.common.appName} report`);
  doc.setAuthor(strings.common.orgName);
  doc.setCreationDate(new Date(report.takenAt));

  // --- letterhead ---------------------------------------------------------
  let textLeft = MARGIN;
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "psws-logo.jpg"));
    const seal = await doc.embedJpg(bytes);
    const size = 52;
    ctx.page.drawImage(seal, {
      x: MARGIN, y: ctx.y - size + 12, width: size, height: size,
    });
    textLeft = MARGIN + size + 14;
  } catch {
    // A missing seal is not worth failing a report over.
  }

  text(ctx, strings.common.orgName, { size: 14, font: bold, x: textLeft });
  ctx.y -= 15;
  text(ctx, strings.common.registration, { size: 9, color: SOFT, x: textLeft });
  ctx.y -= 14;
  text(ctx, strings.common.appName, { size: 11, font: bold, color: BRAND, x: textLeft });

  ctx.y -= 26;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: A4[0] - MARGIN, y: ctx.y },
    thickness: 2,
    color: BRAND,
  });

  // --- what this is -------------------------------------------------------
  ctx.y -= 26;
  text(ctx, strings.admin.reportHeading, { size: 18, font: bold });
  ctx.y -= 16;
  text(ctx, strings.admin.reportTaken(when), { size: 9.5, color: SOFT });
  ctx.y -= 18;
  text(ctx, `${strings.admin.reportStage}: ${report.stage}`, { size: 11, font: bold });
  ctx.y -= 14;
  text(ctx, strings.admin.reportExpected(report.expected), { size: 9.5, color: SOFT });

  block(ctx, strings.admin.reportRegistration, report.registration);
  block(ctx, strings.admin.reportVoting, report.voting);
  block(ctx, strings.admin.reportCountries, report.countries);

  // --- what it is not -----------------------------------------------------
  // Pinned to the foot of the page rather than following the last figure, so
  // a report that fits on one page stays on one page.
  const FOOTER_TOP = MARGIN + 34;
  if (ctx.y < FOOTER_TOP + 20) newPage(ctx);
  ctx.y = FOOTER_TOP;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: A4[0] - MARGIN, y: ctx.y },
    thickness: 1,
    color: RULE,
  });
  ctx.y -= 16;
  text(ctx, strings.admin.reportPrivacy, { size: 9, color: SOFT });
  ctx.y -= 13;
  text(
    ctx,
    `${strings.common.contactLead} ${strings.common.contactName} ${strings.common.contactPhone}`,
    { size: 9, color: SOFT },
  );

  return doc.save();
}
