import express from 'express';
import { supabase } from '../utils/db.js';
import { authenticateToken, authorizeGovernment } from '../middleware/auth.js';
import XLSX from 'xlsx';
import multer from 'multer';
import { appendToExcel } from '../utils/excelwriter.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticateToken, authorizeGovernment);

// ── Row shape helpers ─────────────────────────────────────────────────────────
// These are the ONLY columns that go into the xlsx sheets.
// Any extra Supabase fields (id, created_by, etc.) are intentionally dropped.

const priceRow = (date, modal, min, max, change) => ({
  "Date": date,
  "Modal Price (₹)": modal,
  "Min Price (₹)": min,
  "Max Price (₹)": max,
  "Change (₹)": change,
});

const arrivalRow = (date, qty, change) => ({
  "Date": date,
  "Qty (Tonne)": qty,
  "Change (Tonne)": change,
});

// ── Upload helpers ────────────────────────────────────────────────────────────

const PRICE_COLS = ["Date", "Modal Price (₹)", "Min Price (₹)", "Max Price (₹)", "Change (₹)"];
const ARRIVAL_COLS = ["Date", "Qty (Tonne)", "Change (Tonne)"];

const CEREAL_SHEETS = [
  { sheetName: "Wheat Price", type: "price" },
  { sheetName: "Wheat Arrival", type: "arrival" },
  { sheetName: "Rice Price", type: "price" },
  { sheetName: "Rice Arrival", type: "arrival" },
  { sheetName: "Arhar (Tur Dal) Price", type: "price" },
  { sheetName: "Arhar (Tur Dal) Arrival", type: "arrival" },
];

const VEGETABLE_SHEETS = [
  { sheetName: "Onion Price", type: "price" },
  { sheetName: "Onion Arrival", type: "arrival" },
  { sheetName: "Potato Price", type: "price" },
  { sheetName: "Potato Arrival", type: "arrival" },
  { sheetName: "Tomato Price", type: "price" },
  { sheetName: "Tomato Arrival", type: "arrival" },
];

const validateColumns = (rows, expectedCols, sheetName) => {
  if (!rows.length) return `Sheet "${sheetName}" is empty.`;
  const actual = Object.keys(rows[0]);
  const missing = expectedCols.filter(c => !actual.includes(c));
  if (missing.length) return `Sheet "${sheetName}" missing columns: ${missing.join(", ")}`;
  return null;
};

/**
 * Parse an uploaded buffer and append ONLY the allowed columns per sheet type.
 * Extra columns in the uploaded file are silently ignored.
 */
const processUpload = (buffer, fileName, sheetConfig) => {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const summary = { imported: 0, skipped: [], errors: [] };

  for (const { sheetName, type } of sheetConfig) {
    if (!wb.SheetNames.includes(sheetName)) {
      summary.skipped.push(`"${sheetName}" not found in uploaded file`);
      continue;
    }

    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { defval: null });
    const expectedCols = type === "price" ? PRICE_COLS : ARRIVAL_COLS;
    const colError = validateColumns(rows, expectedCols, sheetName);

    if (colError) { summary.errors.push(colError); continue; }

    for (const raw of rows) {
      try {
        // Build a strictly-shaped row — no extra keys allowed through
        const row = type === "price"
          ? priceRow(raw["Date"], raw["Modal Price (₹)"], raw["Min Price (₹)"], raw["Max Price (₹)"], raw["Change (₹)"])
          : arrivalRow(raw["Date"], raw["Qty (Tonne)"], raw["Change (Tonne)"]);

        appendToExcel(fileName, sheetName, row);
        summary.imported++;
      } catch (err) {
        summary.errors.push(`Row in "${sheetName}": ${err.message}`);
      }
    }
  }

  return summary;
};

// ── POST /upload/cereal-prices ────────────────────────────────────────────────
router.post("/upload/cereal-prices", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  if (!req.file.originalname.endsWith(".xlsx"))
    return res.status(400).json({ error: "Only .xlsx files are accepted." });

  try {
    const summary = processUpload(req.file.buffer, "Cereal_Price", CEREAL_SHEETS);
    if (summary.errors.length && summary.imported === 0)
      return res.status(422).json({ error: "Upload failed.", details: summary.errors });
    res.status(200).json({ message: `Cereal prices updated. ${summary.imported} rows imported.`, ...summary });
  } catch (err) {
    console.error("Cereal upload error:", err);
    res.status(500).json({ error: "Failed to process cereal price file." });
  }
});

// ── POST /upload/vegetable-prices ─────────────────────────────────────────────
router.post("/upload/vegetable-prices", upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded." });
  if (!req.file.originalname.endsWith(".xlsx"))
    return res.status(400).json({ error: "Only .xlsx files are accepted." });

  try {
    const summary = processUpload(req.file.buffer, "Vegetable_Price", VEGETABLE_SHEETS);
    if (summary.errors.length && summary.imported === 0)
      return res.status(422).json({ error: "Upload failed.", details: summary.errors });
    res.status(200).json({ message: `Vegetable prices updated. ${summary.imported} rows imported.`, ...summary });
  } catch (err) {
    console.error("Vegetable upload error:", err);
    res.status(500).json({ error: "Failed to process vegetable price file." });
  }
});

// ── Individual form entry: Vegetable & Cereal prices / arrivals ───────────────

const VEGETABLE_COMMODITIES = ["Onion", "Potato", "Tomato"];
const CEREAL_COMMODITIES = ["Wheat", "Rice", "Arhar (Tur Dal)"];

router.post("/prices/vegetable", async (req, res) => {
  try {
    const { commodity, date, modal_price, min_price, max_price, change } = req.body;

    if (!commodity || !date || modal_price === undefined || min_price === undefined || max_price === undefined || change === undefined)
      return res.status(400).json({ error: "Missing required fields" });

    if (!VEGETABLE_COMMODITIES.includes(commodity))
      return res.status(400).json({ error: `Invalid commodity. Must be one of: ${VEGETABLE_COMMODITIES.join(", ")}` });

    // const { data, error } = await supabase
    //   .from("market_prices")
    //   .insert([{ commodity, date, modal_price, min_price, max_price, change, created_by: req.userId }])
    //   .select().single();

    // if (error) throw error;

    appendToExcel("Vegetable_Price", `${commodity} Price`, priceRow(date, modal_price, min_price, max_price, change));
    res.status(201).json({ message: `${commodity} price added successfully` });
  } catch (error) {
    console.error("Error adding vegetable price:", error);
    res.status(500).json({ error: "Failed to add vegetable price" });
  }
});

router.post("/prices/cereal", async (req, res) => {
  try {
    const { commodity, date, modal_price, min_price, max_price, change } = req.body;

    if (!commodity || !date || modal_price === undefined || min_price === undefined || max_price === undefined || change === undefined)
      return res.status(400).json({ error: "Missing required fields" });

    if (!CEREAL_COMMODITIES.includes(commodity))
      return res.status(400).json({ error: `Invalid commodity. Must be one of: ${CEREAL_COMMODITIES.join(", ")}` });

    const { data, error } = await supabase
      .from("cereal_prices")
      .insert([{ commodity, date, modal_price, min_price, max_price, change, created_by: req.userId }])
      .select().single();

    if (error) throw error;

    appendToExcel("Cereal_Price", `${commodity} Price`, priceRow(date, modal_price, min_price, max_price, change));
    res.status(201).json({ message: `${commodity} price added successfully`, data });
  } catch (error) {
    console.error("Error adding cereal price:", error);
    res.status(500).json({ error: "Failed to add cereal price" });
  }
});

router.post("/arrivals/vegetable", async (req, res) => {
  try {
    const { commodity, date, qty, change } = req.body;

    if (!commodity || !date || qty === undefined || change === undefined)
      return res.status(400).json({ error: "Missing required fields" });

    if (!VEGETABLE_COMMODITIES.includes(commodity))
      return res.status(400).json({ error: `Invalid commodity. Must be one of: ${VEGETABLE_COMMODITIES.join(", ")}` });

    const { data, error } = await supabase
      .from("vegetable_arrivals")
      .insert([{ commodity, date, qty, change, created_by: req.userId }])
      .select().single();

    if (error) throw error;

    appendToExcel("Vegetable_Price", `${commodity} Arrival`, arrivalRow(date, qty, change));
    res.status(201).json({ message: `${commodity} arrival added successfully`, data });
  } catch (error) {
    console.error("Error adding vegetable arrival:", error);
    res.status(500).json({ error: "Failed to add vegetable arrival" });
  }
});

router.post("/arrivals/cereal", async (req, res) => {
  try {
    const { commodity, date, qty, change } = req.body;

    if (!commodity || !date || qty === undefined || change === undefined)
      return res.status(400).json({ error: "Missing required fields" });

    if (!CEREAL_COMMODITIES.includes(commodity))
      return res.status(400).json({ error: `Invalid commodity. Must be one of: ${CEREAL_COMMODITIES.join(", ")}` });

    const { data, error } = await supabase
      .from("cereal_arrivals")
      .insert([{ commodity, date, qty, change, created_by: req.userId }])
      .select().single();

    if (error) throw error;

    appendToExcel("Cereal_Price", `${commodity} Arrival`, arrivalRow(date, qty, change));
    res.status(201).json({ message: `${commodity} arrival added successfully`, data });
  } catch (error) {
    console.error("Error adding cereal arrival:", error);
    res.status(500).json({ error: "Failed to add cereal arrival" });
  }
});

// ── MSP ───────────────────────────────────────────────────────────────────────

// router.post("/msp", async (req, res) => {
//   try {
//     const { commodity, price, year } = req.body;
//     if (!commodity || !price || !year)
//       return res.status(400).json({ error: "Missing required fields" });

//     const { data, error } = await supabase
//       .from("msp")
//       .insert([{ commodity, price, year, created_by: req.userId }])
//       .select().single();

//     if (error) throw error;

//     // Only store the business columns — not id / created_by
//     appendToExcel("msp_data", "MSP", { commodity: data.commodity, price: data.price, year: data.year });
//     res.status(201).json({ message: "MSP added successfully", data });
//   } catch (error) {
//     console.error("Error adding MSP:", error);
//     res.status(500).json({ error: "Failed to add MSP" });
//   }
// });

// router.put("/msp/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { commodity, price, year } = req.body;
//     const { data, error } = await supabase
//       .from("msp").update({ commodity, price, year }).eq("id", id).select().single();
//     if (error) throw error;
//     res.json({ message: "MSP updated successfully", data });
//   } catch (error) {
//     console.error("Error updating MSP:", error);
//     res.status(500).json({ error: "Failed to update MSP" });
//   }
// });

// router.delete("/msp/:id", async (req, res) => {
//   try {
//     const { error } = await supabase.from("msp").delete().eq("id", req.params.id);
//     if (error) throw error;
//     res.json({ message: "MSP deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting MSP:", error);
//     res.status(500).json({ error: "Failed to delete MSP" });
//   }
// });

// // ── Cold Storage ──────────────────────────────────────────────────────────────

// router.post("/cold-storage", async (req, res) => {
//   try {
//     const { date, state, fci_owned, private_owned, total_units, storage_capacity } = req.body;
//     if (!date || !state || total_units === undefined || !storage_capacity)
//       return res.status(400).json({ error: "Missing required fields" });

//     const { data, error } = await supabase
//       .from("cold_storage")
//       .insert([{ date, state, fci_owned: fci_owned || 0, private_owned: private_owned || 0, total_units, storage_capacity, created_by: req.userId }])
//       .select().single();

//     if (error) throw error;

//     appendToExcel("cold_storage", "ColdStorage", {
//       date: data.date, state: data.state,
//       fci_owned: data.fci_owned, private_owned: data.private_owned,
//       total_units: data.total_units, storage_capacity: data.storage_capacity,
//     });
//     res.status(201).json({ message: "Cold storage data added successfully", data });
//   } catch (error) {
//     console.error("Error adding cold storage:", error);
//     res.status(500).json({ error: "Failed to add cold storage data" });
//   }
// });

// router.put("/cold-storage/:id", async (req, res) => {
//   try {
//     const { date, state, fci_owned, private_owned, total_units, storage_capacity } = req.body;
//     const { data, error } = await supabase
//       .from("cold_storage").update({ date, state, fci_owned, private_owned, total_units, storage_capacity }).eq("id", req.params.id).select().single();
//     if (error) throw error;
//     res.json({ message: "Cold storage data updated successfully", data });
//   } catch (error) {
//     console.error("Error updating cold storage:", error);
//     res.status(500).json({ error: "Failed to update cold storage data" });
//   }
// });

// router.delete("/cold-storage/:id", async (req, res) => {
//   try {
//     const { error } = await supabase.from("cold_storage").delete().eq("id", req.params.id);
//     if (error) throw error;
//     res.json({ message: "Cold storage data deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting cold storage:", error);
//     res.status(500).json({ error: "Failed to delete cold storage data" });
//   }
// });

// // ── Fuel Prices ───────────────────────────────────────────────────────────────

// router.post("/fuel-prices", async (req, res) => {
//   try {
//     const { date, cng, petrol, diesel } = req.body;
//     if (!date || cng === undefined || petrol === undefined || diesel === undefined)
//       return res.status(400).json({ error: "Missing required fields" });

//     const { data, error } = await supabase
//       .from("fuel_prices")
//       .insert([{ date, cng, petrol, diesel, created_by: req.userId }])
//       .select().single();

//     if (error) throw error;

//     appendToExcel("fuel_prices", "FuelPrices", { date: data.date, cng: data.cng, petrol: data.petrol, diesel: data.diesel });
//     res.status(201).json({ message: "Fuel price added successfully", data });
//   } catch (error) {
//     console.error("Error adding fuel price:", error);
//     res.status(500).json({ error: "Failed to add fuel price" });
//   }
// });

// router.put("/fuel-prices/:id", async (req, res) => {
//   try {
//     const { date, cng, petrol, diesel } = req.body;
//     const { data, error } = await supabase
//       .from("fuel_prices").update({ date, cng, petrol, diesel }).eq("id", req.params.id).select().single();
//     if (error) throw error;
//     res.json({ message: "Fuel price updated successfully", data });
//   } catch (error) {
//     console.error("Error updating fuel price:", error);
//     res.status(500).json({ error: "Failed to update fuel price" });
//   }
// });

// router.delete("/fuel-prices/:id", async (req, res) => {
//   try {
//     const { error } = await supabase.from("fuel_prices").delete().eq("id", req.params.id);
//     if (error) throw error;
//     res.json({ message: "Fuel price deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting fuel price:", error);
//     res.status(500).json({ error: "Failed to delete fuel price" });
//   }
// });

// // ── Market Prices ─────────────────────────────────────────────────────────────

// router.post("/market-prices", async (req, res) => {
//   try {
//     const { commodity, state, date, price_per_quintal } = req.body;
//     if (!commodity || !state || !date || price_per_quintal === undefined)
//       return res.status(400).json({ error: "Missing required fields" });

//     const { data, error } = await supabase
//       .from("market_prices")
//       .insert([{ commodity, state, date, price_per_quintal, created_by: req.userId }])
//       .select().single();

//     if (error) throw error;

//     appendToExcel("market_prices", "MarketPrices", {
//       commodity: data.commodity, state: data.state,
//       date: data.date, price_per_quintal: data.price_per_quintal,
//     });
//     res.status(201).json({ message: "Market price added successfully", data });
//   } catch (error) {
//     console.error("Error adding market price:", error);
//     res.status(500).json({ error: "Failed to add market price" });
//   }
// });

// router.put("/market-prices/:id", async (req, res) => {
//   try {
//     const { commodity, state, date, price_per_quintal } = req.body;
//     const { data, error } = await supabase
//       .from("market_prices").update({ commodity, state, date, price_per_quintal }).eq("id", req.params.id).select().single();
//     if (error) throw error;
//     res.json({ message: "Market price updated successfully", data });
//   } catch (error) {
//     console.error("Error updating market price:", error);
//     res.status(500).json({ error: "Failed to update market price" });
//   }
// });

// router.delete("/market-prices/:id", async (req, res) => {
//   try {
//     const { error } = await supabase.from("market_prices").delete().eq("id", req.params.id);
//     if (error) throw error;
//     res.json({ message: "Market price deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting market price:", error);
//     res.status(500).json({ error: "Failed to delete market price" });
//   }
// });

// // ── Export ────────────────────────────────────────────────────────────────────

// router.get("/export/msp", async (req, res) => {
//   try {
//     const { data: mspData, error } = await supabase
//       .from("msp").select("*").order("year", { ascending: false });
//     if (error) throw error;

//     const workbook  = XLSX.utils.book_new();
//     const worksheet = XLSX.utils.json_to_sheet(mspData);
//     XLSX.utils.book_append_sheet(workbook, worksheet, "MSP");

//     const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
//     res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
//     res.setHeader("Content-Disposition", "attachment; filename=MSP_Data.xlsx");
//     res.send(buffer);
//   } catch (error) {
//     console.error("Error exporting MSP:", error);
//     res.status(500).json({ error: "Failed to export MSP" });
//   }
// });

export default router;