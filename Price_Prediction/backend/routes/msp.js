// backend/routes/msp.js
import express from "express";
import { readMSPSheet } from "../dataLoader.js";

const router = express.Router();

// ─── GET /api/msp ─────────────────────────────────────────────
// Returns all commodities × all years, plus computed change fields
// ?commodity=rice   → filter to one commodity (case-insensitive)
// ?year=2024-25     → filter to one year column
router.get("/", (req, res) => {
    try {
        const all = readMSPSheet();
        let data = all;

        if (req.query.commodity) {
            const q = req.query.commodity.toLowerCase();
            data = data.filter((r) => r.commodity.toLowerCase().includes(q));
        }
        if (req.query.year) {
            data = data.map((r) => {
                const yr = req.query.year;
                if (!(yr in r.history)) return null;
                return {
                    commodity: r.commodity,
                    year: yr,
                    msp: r.history[yr],
                };
            }).filter(Boolean);
        }

        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── GET /api/msp/years ───────────────────────────────────────
// Returns the sorted list of year strings present in the sheet
router.get("/years", (_req, res) => {
    try {
        const [first] = readMSPSheet();
        const years = Object.keys(first?.history ?? {});
        res.json({ success: true, years });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── GET /api/msp/latest ─────────────────────────────────────
// Returns each commodity's most-recent MSP, previous MSP, absolute + % change
router.get("/latest", (_req, res) => {
    try {
        const all = readMSPSheet();
        const data = all.map((row) => {
            const years = Object.keys(row.history);
            const latestYear = years[years.length - 1];
            const prevYear = years[years.length - 2];
            const currentMSP = row.history[latestYear];
            const previousMSP = row.history[prevYear];
            const change = currentMSP - previousMSP;
            const changePct = ((change / previousMSP) * 100).toFixed(2);
            return {
                commodity: row.commodity,
                currentMSP,
                previousMSP,
                change,
                changePct,
                year: latestYear,
                prevYear,
            };
        });
        const latestYear = data[0]?.year ?? null;
        res.json({ success: true, data, year: latestYear });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── GET /api/msp/trend/:commodity ───────────────────────────
// Returns year-by-year history for one commodity
// ?from=2018-19   → optional start year (inclusive)
router.get("/trend/:commodity", (req, res) => {
    try {
        const all = readMSPSheet();
        const match = all.find(
            (r) => r.commodity.toLowerCase() === req.params.commodity.toLowerCase()
        );
        if (!match) {
            return res.status(404).json({
                success: false,
                error: `Commodity "${req.params.commodity}" not found`,
            });
        }

        let trend = Object.entries(match.history).map(([year, msp]) => ({ year, msp }));

        if (req.query.from) {
            const fromIdx = trend.findIndex((t) => t.year === req.query.from);
            if (fromIdx !== -1) trend = trend.slice(fromIdx);
        }

        res.json({ success: true, commodity: match.commodity, trend });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ─── GET /api/msp/summary ────────────────────────────────────
// Aggregated stats across all commodities for the latest year:
// avgChangePct, highestMSP crop, lowestMSP crop, mostImproved crop
router.get("/summary", (_req, res) => {
    try {
        const all = readMSPSheet();
        const latest = all.map((row) => {
            const years = Object.keys(row.history);
            const latestYear = years[years.length - 1];
            const prevYear = years[years.length - 2];
            const currentMSP = row.history[latestYear];
            const previousMSP = row.history[prevYear];
            const changePct = ((currentMSP - previousMSP) / previousMSP) * 100;
            return { commodity: row.commodity, currentMSP, previousMSP, changePct, year: latestYear };
        });

        const sorted = [...latest].sort((a, b) => b.currentMSP - a.currentMSP);
        const avgChange = (latest.reduce((s, r) => s + r.changePct, 0) / latest.length).toFixed(2);
        const mostImp = [...latest].sort((a, b) => b.changePct - a.changePct)[0];

        res.json({
            success: true,
            year: latest[0]?.year ?? null,
            avgChangePct: Number(avgChange),
            highestMSP: { commodity: sorted[0].commodity, msp: sorted[0].currentMSP },
            lowestMSP: { commodity: sorted[sorted.length - 1].commodity, msp: sorted[sorted.length - 1].currentMSP },
            mostImproved: { commodity: mostImp.commodity, changePct: Number(mostImp.changePct.toFixed(2)) },
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;