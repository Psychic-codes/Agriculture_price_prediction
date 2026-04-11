// backend/dataLoader.js
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const DATA_DIR = join(__dirname, "../../ml_pipeline/data");

// ─── Startup checks ───────────────────────────────────────────
const REQUIRED_FILES = ["Vegetable_Price.xlsx", "Cereal_Price.xlsx", "MSP.xlsx"];
for (const f of REQUIRED_FILES) {
    const fullPath = join(DATA_DIR, f);
    if (!existsSync(fullPath)) {
        console.error(`\n❌  Missing data file: ${fullPath}`);
        console.error(`    Place all Excel files inside the "data" folder next to dataLoader.js\n`);
        process.exit(1);
    }
}
console.log(`✅  Data directory: ${DATA_DIR}`);

// ─── Commodity map (unchanged) ────────────────────────────────
export const COMMODITY_MAP = {
    onion:  { file: "Vegetable_Price.xlsx", priceSheet: "Onion Price",           arrivalSheet: "Onion Arrival",           category: "Vegetables", emoji: "🧅", unit: "quintal", displayName: "Onion"          },
    potato: { file: "Vegetable_Price.xlsx", priceSheet: "Potato Price",          arrivalSheet: "Potato Arrival",          category: "Vegetables", emoji: "🥔", unit: "quintal", displayName: "Potato"         },
    tomato: { file: "Vegetable_Price.xlsx", priceSheet: "Tomato Price",          arrivalSheet: "Tomato Arrival",          category: "Vegetables", emoji: "🍅", unit: "quintal", displayName: "Tomato"         },
    wheat:  { file: "Cereal_Price.xlsx",    priceSheet: "Wheat Price",           arrivalSheet: "Wheat Arrival",           category: "Cereals",    emoji: "🌾", unit: "quintal", displayName: "Wheat"          },
    rice:   { file: "Cereal_Price.xlsx",    priceSheet: "Rice Price",            arrivalSheet: "Rice Arrival",            category: "Cereals",    emoji: "🍚", unit: "quintal", displayName: "Rice"           },
    arhar:  { file: "Cereal_Price.xlsx",    priceSheet: "Arhar (Tur Dal) Price", arrivalSheet: "Arhar (Tur Dal) Arrival", category: "Pulses",     emoji: "🫘", unit: "quintal", displayName: "Arhar (Tur Dal)" },
};

// ─── MSP commodity meta (mirrors COMMODITY_MAP for known crops) ──
const MSP_META = {
    "Rice":            { id: "rice",  ...COMMODITY_MAP.rice  },
    "Wheat":           { id: "wheat", ...COMMODITY_MAP.wheat },
    "Arhar (Tur Dal)": { id: "arhar", ...COMMODITY_MAP.arhar },
};

// ─── In-memory workbook cache ─────────────────────────────────
const workbookCache = new Map();

function getWorkbook(file) {
    if (!workbookCache.has(file)) {
        const buf = readFileSync(join(DATA_DIR, file));
        const wb  = XLSX.read(buf, { type: "buffer", cellDates: true });
        workbookCache.set(file, wb);
    }
    return workbookCache.get(file);
}

function formatDate(val) {
    if (!val) return null;
    if (val instanceof Date) return val.toISOString().slice(0, 10);
    return String(val).slice(0, 10);
}

// ─── Price sheet reader (unchanged) ──────────────────────────
export function readPriceSheet(file, sheetName, limit = 90) {
    const wb = getWorkbook(file);
    const ws = wb.Sheets[sheetName];
    if (!ws) throw new Error(`Sheet "${sheetName}" not found in ${file}`);

    const rows   = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    const result = [];
    for (let i = 1; i < rows.length && result.length < limit; i++) {
        const r    = rows[i];
        const date = formatDate(r[0]);
        if (!date) continue;
        result.push({
            date,
            modal:  typeof r[1] === "number" ? r[1] : null,
            min:    typeof r[2] === "number" ? r[2] : null,
            max:    typeof r[3] === "number" ? r[3] : null,
            change: typeof r[4] === "number" ? r[4] : null,
        });
    }
    return result;
}

// ─── Arrival sheet reader (unchanged) ────────────────────────
export function readArrivalSheet(file, sheetName, limit = 90) {
    const wb = getWorkbook(file);
    const ws = wb.Sheets[sheetName];
    if (!ws) throw new Error(`Sheet "${sheetName}" not found in ${file}`);

    const rows   = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
    const result = [];
    for (let i = 1; i < rows.length && result.length < limit; i++) {
        const r    = rows[i];
        const date = formatDate(r[0]);
        if (!date) continue;
        result.push({
            date,
            qty:    typeof r[1] === "number" ? r[1] : null,
            change: typeof r[2] === "number" ? r[2] : null,
        });
    }
    return result;
}

// ─── MSP sheet reader (NEW) ───────────────────────────────────
// Returns all rows from MSP.xlsx → Sheet1
// Shape: [{ commodity, meta, history: { "2013-14": 1310, … } }]
let _mspCache = null;

export function readMSPSheet() {
    if (_mspCache) return _mspCache;

    const wb = getWorkbook("MSP.xlsx");
    // Accept "Sheet1" or the first sheet, whatever it's named
    const sheetName = wb.SheetNames.includes("Sheet1") ? "Sheet1" : wb.SheetNames[0];
    const ws  = wb.Sheets[sheetName];
    if (!ws) throw new Error(`MSP sheet not found in MSP.xlsx`);

    const rows = XLSX.utils.sheet_to_json(ws, { defval: null });
    // rows[i] = { Commodity: "Rice", "2013-14": 1310, "2014-15": 1360, … }

    _mspCache = rows
        .filter((r) => r["Commodity"])
        .map((r) => {
            const commodity = String(r["Commodity"]).trim();
            const history   = {};
            for (const [key, val] of Object.entries(r)) {
                if (key === "Commodity") continue;
                if (typeof val === "number") history[key] = val;
            }
            return {
                commodity,
                meta: MSP_META[commodity] ?? null,   // null for unknown crops
                history,                              // { "2013-14": 1310, … }
            };
        });

    return _mspCache;
}

// ─── Fuel Prices CSV reader (NEW) ────────────────────────────
export function readFuelSheet() {
    const filePath = join(DATA_DIR, "Fuel_prices.csv");
    if (!existsSync(filePath)) throw new Error(`Fuel prices sheet not found at ${filePath}`);
    
    // Read raw txt lines
    const rawContent = readFileSync(filePath, "utf-8");
    const lines = rawContent.split(/\r?\n/).filter(line => line.trim() && !line.startsWith("Month,"));

    const data = [];
    for (const line of lines) {
        const parts = line.split(",");
        if (parts.length < 5) continue;
        const [month, pStr, dStr, year, state] = parts;
        if (!month || month === "") continue;

        // Clean outasterisks cleanly
        const petrol = parseFloat(pStr.replace(/\*/g, ""));
        const diesel = parseFloat(dStr.replace(/\*/g, ""));
        if (!isNaN(petrol) && !isNaN(diesel)) {
            data.push({
                month: month.trim(),
                year: parseInt(year.trim(), 10),
                petrol,
                diesel,
                state: state.trim()
            });
        }
    }
    return data;
}