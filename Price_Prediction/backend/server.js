import express from "express";
import cors from "cors";
import commoditiesRouter from "./routes/commodities.js";
import categoriesRouter from "./routes/categories.js";
import mspRouter from "./routes/msp.js";
import weatherRouter from "./routes/weather.js";
import fuelRouter from "./routes/fuel.js";
import path from "path";
import AuthRouter from "./routes/auth.js"
import GovtRouter from "./routes/government.js"
import { fileURLToPath } from "url";
import fs from "fs";

const app = express();
const PORT = process.env.PORT ?? 5000;

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({ origin: "*" }));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────
app.use("/api/auth", AuthRouter);
app.use("/api/commodities", commoditiesRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/msp", mspRouter);
app.use("/api/weather", weatherRouter);
app.use("/api/fuel", fuelRouter);
app.use("/api/government", GovtRouter);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootProjectDir = path.resolve(__dirname, "../../");

// Expose the high-resolution generated plots from the Python pipeline natively
app.use("/plots/shap", express.static(path.join(rootProjectDir, "ml_pipeline/plots/shap")));
app.use("/plots/performance", express.static(path.join(rootProjectDir, "ml_pipeline/plots/performance")));

// Serve the raw ML JSON array dynamically calculated by the Stacking layers
app.get("/api/ml-forecasts", (req, res) => {
    try {
        const filePath = path.join(rootProjectDir, "ml_pipeline/latest_forecasts.json");
        if (!fs.existsSync(filePath)) {
            return res.status(503).json({ error: "ML Forecasts not generated yet. Running predict.py..." });
        }
        const data = fs.readFileSync(filePath, "utf-8");
        res.json(JSON.parse(data));
    } catch (err) {
        console.error("[Forecast API Error]", err);
        res.status(500).json({ error: "Failed to read forecasting payload." });
    }
});

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ─── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🌱  Fertile Data API  →  http://localhost:${PORT}\n`);
    console.log("  GET /api/health");
    console.log("  GET /api/categories");
    console.log("  GET /api/commodities");
    console.log("  GET /api/commodities/:id/price?days=90");
    console.log("  GET /api/commodities/:id/arrival?days=90");
    console.log("  GET /api/msp");
    console.log("  GET /api/msp/years");
    console.log("  GET /api/msp/latest");
    console.log("  GET /api/msp/summary");
    console.log("  GET /api/msp/trend/:commodity");
    console.log("  GET /api/weather?lat=19.076&lon=72.8777\n");
    console.log("  [AI ML Core]");
    console.log("  GET /api/ml-forecasts  (Returns deeply stacked trajectories + SHAP drivers)");
    console.log("  GET /plots/:name.png   (Statically mapped AI predictive plots)");
});