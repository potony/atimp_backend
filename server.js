// server.js
import dotenv from "dotenv";
import express from "express";

import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";                   // 👈 1) add this
import { connectDB } from "./db/connectDB.js";
import { config } from "./config.js";
import movementsRouter from "./src/routes/movements.js";
import adminRouter from "./src/routes/admin.js";

import joinRouter from "./src/routes/join.js";
import heroRouter from "./src/routes/hero.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

await connectDB();

const app = express();

// 👇 2) enable CORS for your frontend
app.use(cors({
  origin: [
    'http://localhost:4200',
    'http://127.0.0.1:4200',
    'https://atreeinmypocket.com',
    'https://www.atreeinmypocket.com'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  credentials: true
}));

app.use(express.json());
app.use("/uploads", express.static("uploads"));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/join", joinRouter);
app.use("/api/hero", heroRouter);

app.use("/api/admin", adminRouter);
app.use("/api/movements", movementsRouter);
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "Backend is live and connected!" });
});

app.listen(config.PORT, () => {
  console.log(`✅ ATIMP API running on port ${config.PORT}`);
});