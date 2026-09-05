import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  PDFDocument,
  PDFString,
  StandardFonts,
  rgb,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";
import type { Report, ReportLine, VotingTimeline } from "./admin-data";
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
const LINK = rgb(0.05, 0.32, 0.55);

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

/** Which language this copy is written in. Never both on one page. */
export type ReportLang = "en" | "hi";

function block(ctx: Ctx, title: string, rows: ReportLine[], lang: ReportLang): void {
  if (rows.length === 0) return;
  room(ctx, 36 + rows.length * 23);

  ctx.y -= 18;
  text(ctx, title.toUpperCase(), { size: 9, font: ctx.bold, color: SOFT });
  ctx.y -= 5;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: A4[0] - MARGIN, y: ctx.y },
    thickness: 1,
    color: RULE,
  });
  ctx.y -= 14;

  const right = A4[0] - MARGIN;
  for (const row of rows) {
    room(ctx, 26);
    text(ctx, lang === "hi" ? row.labelHi : row.label, { size: 10.5 });

    const count = String(row.count);
    const outOf =
      lang === "hi"
        ? strings.admin.hi.outOf(row.outOfHi)
        : strings.admin.reportOutOf(row.outOf);
    const share = row.percent === null ? "" : `${row.percent}% ${outOf}`;
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
      ctx.y -= 16;
    } else {
      ctx.y -= 19;
    }
  }
}

/** The society's own heading, drawn on anything it sends out. */
async function letterhead(ctx: Ctx): Promise<void> {
  let textLeft = MARGIN;
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", "psws-logo.jpg"));
    const seal = await ctx.doc.embedJpg(bytes);
    const size = 52;
    ctx.page.drawImage(seal, {
      x: MARGIN, y: ctx.y - size + 12, width: size, height: size,
    });
    textLeft = MARGIN + size + 14;
  } catch {
    // A missing seal is not worth failing a document over.
  }

  text(ctx, strings.common.orgName, { size: 14, font: ctx.bold, x: textLeft });
  ctx.y -= 15;
  text(ctx, strings.common.registration, { size: 9, color: SOFT, x: textLeft });
  ctx.y -= 14;
  text(ctx, strings.common.appName, { size: 11, font: ctx.bold, color: BRAND, x: textLeft });

  ctx.y -= 26;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: A4[0] - MARGIN, y: ctx.y },
    thickness: 2,
    color: BRAND,
  });
}

/**
 * Who has registered, as a page that can go straight into the group.
 *
 * Names and nothing else. No codes, no phone numbers, no seat numbers, so
 * there is nothing on it that could let one man vote as another and nothing
 * that anybody would mind seeing shared.
 */
/**
 * A phone number that dials when it is tapped.
 *
 * The chasing lists go out as a file on a phone, so the number on the page is
 * the number a man is about to ring. Drawn as a link annotation rather than
 * plain text, with the reader who has printed it in mind: it still reads as a
 * number on paper, it just also works in the hand.
 */
function drawPhoneLink(
  ctx: Ctx,
  display: string,
  x: number,
  size = 10,
): void {
  ctx.page.drawText(display, { x, y: ctx.y, size, font: ctx.regular, color: LINK });

  const digits = display.replace(/\D/g, "");
  if (digits.length < 8) return;

  const width = ctx.regular.widthOfTextAtSize(display, size);
  ctx.page.drawLine({
    start: { x, y: ctx.y - 1.5 },
    end: { x: x + width, y: ctx.y - 1.5 },
    thickness: 0.4,
    color: LINK,
  });

  const annotation = ctx.doc.context.register(
    ctx.doc.context.obj({
      Type: "Annot",
      Subtype: "Link",
      Rect: [x - 2, ctx.y - 4, x + width + 2, ctx.y + size],
      Border: [0, 0, 0],
      A: {
        Type: "Action",
        S: "URI",
        URI: PDFString.of(`tel:+${digits}`),
      },
    }),
  );
  ctx.page.node.addAnnot(annotation);
}

export async function namesPdf(
  rows: { name: string; phone: string; joined: string }[],
  when: string,
  /**
   * Which list this is. The registered one carries the moment each person
   * arrived; the one still to come has no such column and says so instead.
   */
  kind: "registered" | "missing" | "notvoted" = "registered",
): Promise<Uint8Array> {
  const a = strings.admin;
  const chasing = kind !== "registered";
  const say =
    kind === "notvoted"
      ? {
          heading: a.notVotedHeading,
          headingHi: a.notVotedHeadingHi,
          count: a.notVotedCount(rows.length),
          privacy: a.notVotedPrivacy,
          privacyHi: a.notVotedPrivacyHi,
        }
      : kind === "missing"
        ? {
            heading: a.missingHeading,
            headingHi: a.missingHeadingHi,
            count: a.missingCount(rows.length),
            privacy: a.missingPrivacy,
            privacyHi: a.missingPrivacyHi,
          }
        : {
            heading: a.namesHeading,
            headingHi: a.namesHeadingHi,
            count: a.namesCount(rows.length),
            privacy: a.namesPrivacy,
            privacyHi: a.namesPrivacyHi,
          };
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = { doc, page: doc.addPage(A4), y: A4[1] - MARGIN, regular, bold };

  doc.setTitle(say.heading);
  doc.setAuthor(strings.common.orgName);

  await letterhead(ctx);

  ctx.y -= 26;
  text(ctx, say.heading, { size: 18, font: bold });
  ctx.y -= 16;
  text(ctx, say.headingHi, { size: 11, color: SOFT });
  ctx.y -= 16;
  text(ctx, say.count, { size: 11, font: bold, color: chasing ? rgb(0.66, 0.42, 0.03) : BRAND });
  ctx.y -= 14;
  text(ctx, a.namesTaken(when), { size: 9, color: SOFT });
  ctx.y -= 12;
  text(ctx, a.namesTapToCall, { size: 9, color: SOFT });

  // Column edges, measured once. Name gets the room because that is the
  // thing a man scans for.
  const NUM = MARGIN;
  const NAME = MARGIN + 26;
  const PHONE = MARGIN + 250;
  const JOINED = A4[0] - MARGIN;
  const ROW = 15;

  const heading = () => {
    ctx.y -= 22;
    text(ctx, a.namesColName, { size: 8.5, font: bold, color: SOFT, x: NAME });
    text(ctx, a.namesColPhone, { size: 8.5, font: bold, color: SOFT, x: PHONE });
    if (!chasing) {
      rightText(ctx, a.namesColJoined, JOINED, { size: 8.5, font: bold, color: SOFT });
    }
    ctx.y -= 6;
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y },
      end: { x: A4[0] - MARGIN, y: ctx.y },
      thickness: 1,
      color: RULE,
    });
    ctx.y -= 14;
  };

  heading();

  rows.forEach((row, i) => {
    // Room for the row, and for the note pinned at the foot of the page.
    if (ctx.y < MARGIN + 54) {
      newPage(ctx);
      heading();
    }
    ctx.page.drawText(String(i + 1), {
      x: NUM, y: ctx.y, size: 9, font: regular, color: SOFT,
    });
    ctx.page.drawText(row.name.slice(0, 40) || a.namesNoName, {
      x: NAME, y: ctx.y, size: 10, font: regular, color: row.name ? INK : SOFT,
    });
    drawPhoneLink(ctx, row.phone, PHONE);
    ctx.page.drawText(row.joined, {
      x: JOINED - regular.widthOfTextAtSize(row.joined, 9),
      y: ctx.y,
      size: 9,
      font: regular,
      color: SOFT,
    });
    ctx.y -= ROW;
  });

  // --- what it is not -----------------------------------------------------
  ctx.y = MARGIN + 30;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: A4[0] - MARGIN, y: ctx.y },
    thickness: 1,
    color: RULE,
  });
  ctx.y -= 14;
  text(ctx, say.privacy, { size: 9, color: SOFT });
  ctx.y -= 12;
  text(ctx, say.privacyHi, { size: 9, color: SOFT });

  return doc.save();
}

/**
 * Both sides of the society's list in one file.
 *
 * The chasing list on its own put men in the group who had already
 * registered, and every one of them said so. Sent as a pair, a man finds his
 * own name on the side he belongs on and settles it himself, and the two
 * numbers add up to the list in front of everybody.
 */
export async function bothListsPdf(
  registered: { name: string; phone: string; joined: string }[],
  missing: { name: string; phone: string; joined: string }[],
  when: string,
): Promise<Uint8Array> {
  const a = strings.admin;
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = { doc, page: doc.addPage(A4), y: A4[1] - MARGIN, regular, bold };

  doc.setTitle(a.bothHeading);
  doc.setAuthor(strings.common.orgName);

  await letterhead(ctx);

  ctx.y -= 26;
  text(ctx, a.bothHeading, { size: 18, font: bold });
  ctx.y -= 16;
  text(ctx, a.bothHeadingHi, { size: 11, color: SOFT });
  ctx.y -= 16;
  text(ctx, a.bothCount(registered.length, missing.length), {
    size: 11, font: bold, color: BRAND,
  });
  ctx.y -= 14;
  text(ctx, a.namesTaken(when), { size: 9, color: SOFT });
  ctx.y -= 12;
  text(ctx, a.bothCheck, { size: 9, color: SOFT });
  ctx.y -= 12;
  text(ctx, a.bothCheckHi, { size: 9, color: SOFT });

  const NUM = MARGIN;
  const NAME = MARGIN + 26;
  const PHONE = MARGIN + 250;
  const JOINED = A4[0] - MARGIN;
  const ROW = 15;

  const side = (
    title: string,
    titleHi: string,
    rows: { name: string; phone: string; joined: string }[],
    tone: typeof BRAND,
    withJoined: boolean,
  ) => {
    ctx.y -= 26;
    if (ctx.y < MARGIN + 90) newPage(ctx);
    text(ctx, title, { size: 13, font: bold, color: tone });
    ctx.y -= 13;
    text(ctx, titleHi, { size: 9.5, color: SOFT });

    const heading = () => {
      ctx.y -= 18;
      text(ctx, a.namesColName, { size: 8.5, font: bold, color: SOFT, x: NAME });
      text(ctx, a.namesColPhone, { size: 8.5, font: bold, color: SOFT, x: PHONE });
      if (withJoined) {
        rightText(ctx, a.namesColJoined, JOINED, { size: 8.5, font: bold, color: SOFT });
      }
      ctx.y -= 6;
      ctx.page.drawLine({
        start: { x: MARGIN, y: ctx.y },
        end: { x: A4[0] - MARGIN, y: ctx.y },
        thickness: 1,
        color: RULE,
      });
      ctx.y -= 14;
    };
    heading();

    rows.forEach((row, i) => {
      if (ctx.y < MARGIN + 54) {
        newPage(ctx);
        heading();
      }
      ctx.page.drawText(String(i + 1), {
        x: NUM, y: ctx.y, size: 9, font: regular, color: SOFT,
      });
      ctx.page.drawText(row.name.slice(0, 40) || a.namesNoName, {
        x: NAME, y: ctx.y, size: 10, font: regular, color: row.name ? INK : SOFT,
      });
      drawPhoneLink(ctx, row.phone, PHONE);
      if (withJoined && row.joined) {
        ctx.page.drawText(row.joined, {
          x: JOINED - regular.widthOfTextAtSize(row.joined, 9),
          y: ctx.y,
          size: 9,
          font: regular,
          color: SOFT,
        });
      }
      ctx.y -= ROW;
    });
  };

  side(a.bothDone(registered.length), a.bothDoneHi, registered, BRAND, true);
  side(a.bothLeft(missing.length), a.bothLeftHi, missing, rgb(0.66, 0.42, 0.03), false);

  ctx.y = MARGIN + 30;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: A4[0] - MARGIN, y: ctx.y },
    thickness: 1,
    color: RULE,
  });
  ctx.y -= 14;
  text(ctx, a.bothPrivacy, { size: 9, color: SOFT });
  ctx.y -= 12;
  text(ctx, a.bothPrivacyHi, { size: 9, color: SOFT });

  return doc.save();
}

/**
 * How the voting went, hour by hour, as a page the society can keep.
 *
 * Every figure here comes from the register, which records the hour a man
 * voted and nothing finer. Nothing on it says what anybody chose, and the
 * ballot box holds no time at all, so no line here can be lined up against
 * a vote.
 */
export async function timelinePdf(
  timeline: VotingTimeline,
  when: string,
): Promise<Uint8Array> {
  const a = strings.admin;
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = { doc, page: doc.addPage(A4), y: A4[1] - MARGIN, regular, bold };

  doc.setTitle(a.timelineHeading);
  doc.setAuthor(strings.common.orgName);
  await letterhead(ctx);

  ctx.y -= 26;
  text(ctx, a.timelineHeading, { size: 18, font: bold });
  ctx.y -= 16;
  text(ctx, a.timelineHeadingHi, { size: 11, color: SOFT });
  ctx.y -= 16;
  text(ctx, a.timelineCount(timeline.voted, timeline.roster), {
    size: 11, font: bold, color: BRAND,
  });
  ctx.y -= 14;
  text(ctx, a.namesTaken(when), { size: 9, color: SOFT });

  // --- the shape of the day in one paragraph ------------------------------
  const facts: [string, string][] = [
    [a.timelineFirst, timeline.first || "-"],
    [a.timelineLast, timeline.last || "-"],
    [a.timelineBusiest, timeline.busiest
      ? `${timeline.busiest.label} (${timeline.busiest.votes})`
      : "-"],
    [a.timelinePerHour, String(timeline.perHour)],
    [a.timelineHoursOpen, String(timeline.hours.length)],
  ];
  ctx.y -= 22;
  for (const [label, value] of facts) {
    room(ctx, 16);
    text(ctx, label, { size: 10, color: SOFT });
    rightText(ctx, value, A4[0] - MARGIN, { size: 10, font: bold });
    ctx.y -= 15;
  }

  // --- the hours ----------------------------------------------------------
  const HOUR_X = MARGIN;
  const VOTES_X = MARGIN + 210;
  const BAR_X = MARGIN + 260;
  const BAR_W = A4[0] - MARGIN - BAR_X - 60;
  const RIGHT = A4[0] - MARGIN;
  const most = Math.max(1, timeline.busiest?.votes ?? 1);

  const heading = () => {
    ctx.y -= 20;
    text(ctx, a.timelineColHour, { size: 8.5, font: bold, color: SOFT, x: HOUR_X });
    text(ctx, a.timelineColVotes, { size: 8.5, font: bold, color: SOFT, x: VOTES_X });
    rightText(ctx, a.timelineColRunning, RIGHT, { size: 8.5, font: bold, color: SOFT });
    ctx.y -= 6;
    ctx.page.drawLine({
      start: { x: MARGIN, y: ctx.y },
      end: { x: A4[0] - MARGIN, y: ctx.y },
      thickness: 1,
      color: RULE,
    });
    ctx.y -= 14;
  };
  heading();

  for (const hour of timeline.hours) {
    if (ctx.y < MARGIN + 54) {
      newPage(ctx);
      heading();
    }
    ctx.page.drawText(hour.label, {
      x: HOUR_X, y: ctx.y, size: 9, font: regular, color: INK,
    });
    ctx.page.drawText(String(hour.votes), {
      x: VOTES_X, y: ctx.y, size: 10, font: bold, color: hour.votes === 0 ? SOFT : INK,
    });
    // A bar against the busiest hour, so the shape of the day reads at a
    // glance rather than having to be worked out from the column.
    ctx.page.drawRectangle({
      x: BAR_X, y: ctx.y - 1, width: BAR_W, height: 6, color: TRACK,
    });
    if (hour.votes > 0) {
      ctx.page.drawRectangle({
        x: BAR_X, y: ctx.y - 1,
        width: Math.max(2, (hour.votes / most) * BAR_W),
        height: 6,
        color: BRAND,
      });
    }
    rightText(ctx, String(hour.running), RIGHT, { size: 9, color: SOFT });
    ctx.y -= 15;
  }

  // --- where they were ----------------------------------------------------
  if (timeline.countries.length > 0) {
    room(ctx, 40 + timeline.countries.length * 15);
    ctx.y -= 16;
    text(ctx, a.reportCountries, { size: 11, font: bold });
    ctx.y -= 16;
    for (const place of timeline.countries) {
      room(ctx, 16);
      text(ctx, place.name, { size: 10 });
      rightText(ctx, String(place.votes), RIGHT, { size: 10, font: bold });
      ctx.y -= 15;
    }
  }

  ctx.y = MARGIN + 30;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: A4[0] - MARGIN, y: ctx.y },
    thickness: 1,
    color: RULE,
  });
  ctx.y -= 14;
  text(ctx, a.timelinePrivacy, { size: 9, color: SOFT });
  ctx.y -= 12;
  text(ctx, a.timelinePrivacyHi, { size: 9, color: SOFT });

  return doc.save();
}

export async function reportPdf(
  report: Report,
  when: string,
  lang: ReportLang = "en",
): Promise<Uint8Array> {
  const a = strings.admin;
  const hi = a.hi;
  const say = {
    heading: lang === "hi" ? hi.heading : a.reportHeading,
    taken: lang === "hi" ? hi.taken(when) : a.reportTaken(when),
    stage: lang === "hi" ? hi.stage : a.reportStage,
    stageValue: lang === "hi" ? report.stageHi : report.stage,
    expected: lang === "hi" ? hi.expected(report.expected) : a.reportExpected(report.expected),
    pace: lang === "hi" ? report.paceHi : report.pace,
    target: lang === "hi" ? hi.target : a.reportTarget,
    registration: lang === "hi" ? hi.registration : a.reportRegistration,
    voting: lang === "hi" ? hi.voting : a.reportVoting,
    countries: lang === "hi" ? hi.countries : a.reportCountries,
    privacy: lang === "hi" ? hi.privacy : a.reportPrivacy,
  };

  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ctx: Ctx = { doc, page: doc.addPage(A4), y: A4[1] - MARGIN, regular, bold };

  doc.setTitle(`${strings.common.appName} report`);
  doc.setAuthor(strings.common.orgName);
  doc.setCreationDate(new Date(report.takenAt));

  await letterhead(ctx);

  // --- what this is -------------------------------------------------------
  ctx.y -= 26;
  text(ctx, say.heading, { size: 18, font: bold });
  ctx.y -= 16;
  text(ctx, say.taken, { size: 9.5, color: SOFT });
  ctx.y -= 18;
  text(ctx, `${say.stage}: ${say.stageValue}`, { size: 11, font: bold });
  ctx.y -= 14;
  text(ctx, say.expected, { size: 9.5, color: SOFT });

  if (say.pace) {
    ctx.y -= 18;
    text(ctx, say.pace, { size: 11, font: bold, color: BRAND });
  }

  block(ctx, say.target, report.target, lang);
  block(ctx, say.registration, report.registration, lang);
  block(ctx, say.voting, report.voting, lang);
  block(ctx, say.countries, report.countries, lang);

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
  text(ctx, say.privacy, { size: 9, color: SOFT });
  ctx.y -= 13;
  text(
    ctx,
    `${strings.common.contactLead} ${strings.common.contactName} ${strings.common.contactPhone}`,
    { size: 9, color: SOFT },
  );

  return doc.save();
}
