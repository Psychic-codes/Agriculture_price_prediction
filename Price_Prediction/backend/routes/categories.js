import { Router } from "express";
import { COMMODITY_MAP } from "../dataLoader.js";

const router = Router();

// ─── GET /api/categories ──────────────────────────────────────
router.get("/", (_req, res) => {
    const counts = {};
    for (const meta of Object.values(COMMODITY_MAP)) {
        counts[meta.category] = (counts[meta.category] ?? 0) + 1;
    }
    const result = Object.entries(counts).map(([label, count]) => ({ label, count }));
    res.json(result);
});

export default router;