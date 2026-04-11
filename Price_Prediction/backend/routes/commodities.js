import { Router } from "express";
import { COMMODITY_MAP, readPriceSheet, readArrivalSheet } from "../dataLoader.js";

const router = Router();

// ─── GET /api/commodities ─────────────────────────────────────
// Query: ?category=Vegetables  (optional)
router.get("/", (req, res) => {
    try {
        const { category } = req.query;
        const result = [];

        for (const [id, meta] of Object.entries(COMMODITY_MAP)) {
            if (category && meta.category.toLowerCase() !== String(category).toLowerCase()) continue;

            const prices = readPriceSheet(meta.file, meta.priceSheet, 30);
            const arrivals = readArrivalSheet(meta.file, meta.arrivalSheet, 1);

            if (!prices.length) continue;

            const latest = prices[0];
            const change = latest.change;
            const trend = change == null ? "stable" : change > 0 ? "up" : change < 0 ? "down" : "stable";
            const trendPercent =
                change != null && latest.modal != null && latest.modal - change !== 0
                    ? Math.round((Math.abs(change) / Math.abs(latest.modal - change)) * 1000) / 10
                    : 0;

            // sparkline: last 14 modal values, reversed to oldest→newest
            const sparkline = prices
                .slice(0, 14)
                .map((p) => p.modal)
                .filter((v) => v != null)
                .reverse();

            result.push({
                id,
                name: meta.displayName,
                category: meta.category,
                emoji: meta.emoji,
                unit: meta.unit,
                modal: latest.modal,
                min: latest.min,
                max: latest.max,
                change,
                trend,
                trendPercent,
                arrivalQty: arrivals[0]?.qty ?? null,
                sparkline,
                date: latest.date,
            });
        }

        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/commodities/:id/price ──────────────────────────
// Query: ?days=90
router.get("/:id/price", (req, res) => {
    try {
        const { id } = req.params;
        const meta = COMMODITY_MAP[id];
        if (!meta) return res.status(404).json({ error: "Commodity not found" });

        const days = Math.min(parseInt(req.query.days ?? "90", 10), 3650);
        const data = readPriceSheet(meta.file, meta.priceSheet, days);
        res.json({ commodity: id, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// ─── GET /api/commodities/:id/arrival ────────────────────────
// Query: ?days=90
router.get("/:id/arrival", (req, res) => {
    try {
        const { id } = req.params;
        const meta = COMMODITY_MAP[id];
        if (!meta) return res.status(404).json({ error: "Commodity not found" });

        const days = Math.min(parseInt(req.query.days ?? "90", 10), 3650);
        const data = readArrivalSheet(meta.file, meta.arrivalSheet, days);
        res.json({ commodity: id, data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;