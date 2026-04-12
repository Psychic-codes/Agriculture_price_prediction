import XLSX from "xlsx";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

const DATA_DIR = path.join(process.cwd(), "excel-data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// ── Lock helpers ─────────────────────────────────────────────────────────────

const acquireLock = (lockPath) => {
  const deadline = Date.now() + 5000;
  while (fs.existsSync(lockPath)) {
    if (Date.now() > deadline)
      throw new Error(`appendToExcel: timeout waiting for lock on ${lockPath}`);
    const until = Date.now() + 50;
    while (Date.now() < until) { /* spin */ }
  }
  fs.writeFileSync(lockPath, String(process.pid));
};

const releaseLock = (lockPath) => {
  try { if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath); } catch { /* ignore */ }
};

// ── XML helpers ───────────────────────────────────────────────────────────────

const escapeXml = (str) =>
  String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

/** JS Date → Excel serial number (days since 1899-12-30 UTC) */
const dateToSerial = (date) =>
  (date.getTime() - Date.UTC(1899, 11, 30)) / 86400000;

/**
 * Convert one XLSX cell object to its OOXML <c> XML string.
 * Uses inline strings so we never need to touch the shared-strings table.
 */
const cellToXml = (cell, addr) => {
  if (cell === undefined || cell.v === null || cell.v === undefined) return "";

  switch (cell.t) {
    case "n":
      return `<c r="${addr}"><v>${cell.v}</v></c>`;
    case "b":
      return `<c r="${addr}" t="b"><v>${cell.v ? 1 : 0}</v></c>`;
    case "d": {
      const serial = dateToSerial(cell.v instanceof Date ? cell.v : new Date(cell.v));
      return `<c r="${addr}"><v>${serial}</v></c>`;
    }
    default: // "s" strings and anything else
      return `<c r="${addr}" t="inlineStr"><is><t>${escapeXml(cell.v)}</t></is></c>`;
  }
};

/**
 * Build a complete OOXML <row r="N">…</row> string from the temp worksheet's
 * data row (row index 1, 0-based), placed at 1-based Excel row `rowIndex`.
 */
const buildRowXml = (ws, rowIndex) => {
  const range = XLSX.utils.decode_range(ws["!ref"]);
  let cells = "";

  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = ws[XLSX.utils.encode_cell({ r: 1, c })];
    if (!cell) continue;
    // encode_cell is 0-based; rowIndex is 1-based so subtract 1
    const addr = XLSX.utils.encode_cell({ r: rowIndex - 1, c });
    cells += cellToXml(cell, addr);
  }

  return `<row r="${rowIndex}">${cells}</row>`;
};

/**
 * Walk xl/workbook.xml + xl/_rels/workbook.xml.rels inside the ZIP to find
 * the entry path (e.g. "xl/worksheets/sheet2.xml") for a given sheet name.
 */
const resolveSheetPath = (zip, sheetName) => {
  const wbXml   = zip.readAsText("xl/workbook.xml");
  const relsXml = zip.readAsText("xl/_rels/workbook.xml.rels");

  const sheetRe = new RegExp(
    `<sheet[^>]+name="${escapeXml(sheetName)}"[^>]+r:id="([^"]+)"`
  );
  const sheetMatch = wbXml.match(sheetRe);
  if (!sheetMatch) return null;

  const relRe = new RegExp(
    `<Relationship[^>]+Id="${sheetMatch[1]}"[^>]+Target="([^"]+)"`
  );
  const relMatch = relsXml.match(relRe);
  if (!relMatch) return null;

  const target = relMatch[1];
  if (target.startsWith("/xl/")) return target.slice(1); // absolute → relative
  if (target.startsWith("xl/")) return target;
  return `xl/${target}`;                                  // relative → prefixed
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Appends a single row to `sheetName` inside `<DATA_DIR>/<fileName>.xlsx`.
 *
 * SAFETY:
 *  • The existing ZIP (xlsx) is NEVER re-encoded by XLSX.writeFile.
 *    We open it with adm-zip, surgically inject one <row> into the sheet XML,
 *    and write to a .tmp file before atomically renaming over the original.
 *    All other sheets, styles, column widths, merged cells, charts, etc. are
 *    preserved byte-for-byte.
 *  • A .lock file serialises concurrent writes.
 *  • Crash-safe: the original file is only replaced after the tmp write succeeds.
 *
 * @param {string} fileName  - Base filename without extension, e.g. "Cereal_Price"
 * @param {string} sheetName - Sheet name exactly as it appears in the workbook
 * @param {object} newRow    - Plain object whose keys match the sheet's header row
 */
export const appendToExcel = (fileName, sheetName, newRow) => {
  const filePath = path.join(DATA_DIR, `${fileName}.xlsx`);
  const lockPath = `${filePath}.lock`;
  const tmpPath  = `${filePath}.tmp`;

  acquireLock(lockPath);

  try {
    // ── First write ever: create the file from scratch ────────────────────
    if (!fs.existsSync(filePath)) {
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([newRow]), sheetName);
      XLSX.writeFile(wb, filePath);
      return;
    }

    // ── File exists: read workbook model (read-only, just for metadata) ───
    const fileBuffer = fs.readFileSync(filePath);
    const wb = XLSX.read(fileBuffer, {
      type: "buffer",
      cellDates: true,
      cellStyles: true,
      cellNF: true,
      sheetStubs: true,
    });

    // ── Sheet doesn't exist yet: add it via XLSX (only new sheet encoded) ─
    if (!wb.Sheets[sheetName]) {
      const ws = XLSX.utils.json_to_sheet([newRow]);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, filePath);
      return;
    }

    // ── Sheet exists: surgical ZIP-level XML insert ───────────────────────
    const ws    = wb.Sheets[sheetName];
    const range = XLSX.utils.decode_range(ws["!ref"]);

    // Build a one-row temp workbook to get correctly-typed cell objects,
    // respecting the existing column order from the sheet's header row.
    const headers = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const hCell = ws[XLSX.utils.encode_cell({ r: 0, c })];
      if (hCell) headers.push(hCell.v);
    }
    const orderedRow = Object.fromEntries(headers.map(h => [h, newRow[h] ?? null]));

    const tmpWb = XLSX.utils.book_new();
    const tmpWs = XLSX.utils.json_to_sheet([orderedRow]);
    XLSX.utils.book_append_sheet(tmpWb, tmpWs, "S");

    // 1-based Excel row to insert at (after last existing row)
    const newRowIndex = range.e.r + 2;
    const newRowXml   = buildRowXml(tmpWs, newRowIndex);

    // Open the real file as a ZIP — every other entry is untouched
    const zip = new AdmZip(filePath);

    const sheetPath = resolveSheetPath(zip, sheetName);
    if (!sheetPath) throw new Error(`Cannot resolve ZIP path for sheet "${sheetName}"`);

    const sheetXml = zip.readAsText(sheetPath);
    if (!sheetXml.includes("</sheetData>"))
      throw new Error(`Sheet "${sheetName}" XML missing </sheetData>`);

    // Inject row + update <dimension ref="...">
    const newRangeStr = XLSX.utils.encode_range({
      s: range.s,
      e: { r: range.e.r + 1, c: range.e.c },
    });

    const patched = sheetXml
      .replace("</sheetData>", `${newRowXml}</sheetData>`)
      .replace(/<dimension ref="[^"]*"/, `<dimension ref="${newRangeStr}"`);

    zip.updateFile(sheetPath, Buffer.from(patched, "utf8"));

    // Write to tmp, then atomically rename → original never corrupted
    zip.writeZip(tmpPath);
    fs.renameSync(tmpPath, filePath);

  } finally {
    releaseLock(lockPath);
    try { if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath); } catch { /* ignore */ }
  }
};