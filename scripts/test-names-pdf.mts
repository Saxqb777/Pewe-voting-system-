/**
 * The chasing lists go out as a file on a phone. Two things about them are
 * easy to break without noticing: the name the society's list carried for a
 * man, and whether his number can be tapped to ring him.
 *
 * Run with: npm run test:names-pdf
 */
import { PDFDocument, PDFName, PDFDict, PDFArray } from "pdf-lib";
import { namesPdf } from "../src/lib/report-pdf";

let failures = 0;
function check(label: string, condition: boolean, extra = "") {
  if (!condition) failures++;
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}${extra ? "  " + extra : ""}`);
}

function dialled(doc: PDFDocument): string[] {
  const found: string[] = [];
  for (const page of doc.getPages()) {
    const annots = page.node.lookup(PDFName.of("Annots"), PDFArray);
    if (!annots) continue;
    for (let i = 0; i < annots.size(); i++) {
      const action = annots.lookup(i, PDFDict)?.lookup(PDFName.of("A"), PDFDict);
      const uri = action?.get(PDFName.of("URI"));
      if (uri) found.push(uri.toString().replace(/^\(|\)$/g, ""));
    }
  }
  return found;
}

const rows = [
  { name: "A Gaffar Pewa", phone: "+91 7887975151", joined: "" },
  { name: "Aatif Amin Khan", phone: "+974 33291868", joined: "" },
  { name: "", phone: "+971 559568903", joined: "" },
];

for (const kind of ["missing", "registered"] as const) {
  const bytes = await namesPdf(rows, "3 September 2026", kind);
  const doc = await PDFDocument.load(bytes);
  const links = dialled(doc);
  check(`${kind}: one dialling link per man`, links.length === 3, links.join(" "));
  check(
    `${kind}: the link dials the number on the page`,
    links[0] === "tel:+917887975151",
    links[0] ?? "none",
  );
  check(
    `${kind}: a man with no name on file still gets a link`,
    links[2] === "tel:+971559568903",
    links[2] ?? "none",
  );
}

// A list long enough to run over the page break keeps its links on every page.
const many = Array.from({ length: 90 }, (_, i) => ({
  name: `Person ${i + 1}`,
  phone: `+91 78879${String(70000 + i)}`,
  joined: "",
}));
const longDoc = await PDFDocument.load(await namesPdf(many, "3 September 2026", "missing"));
check("more than one page", longDoc.getPageCount() > 1, `${longDoc.getPageCount()} pages`);
check(
  "every row on every page is dialling",
  dialled(longDoc).length === 90,
  `${dialled(longDoc).length} links`,
);

console.log(failures === 0 ? "\nAll names PDF checks passed." : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
