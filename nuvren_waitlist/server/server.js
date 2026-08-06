import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createAdminToken, requireAdmin } from "./auth.js";
import { assertRequiredConfig, config } from "./config.js";
import { connectWaitlistDatabase } from "./db.js";
import { WaitlistEntry } from "./models/WaitlistEntry.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
let readyPromise;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const roles = new Set(["Job Seeker", "Employer"]);

app.use(express.json({ limit: "50kb" }));

function ensureReady() {
  if (!readyPromise) {
    assertRequiredConfig();
    readyPromise = connectWaitlistDatabase();
  }

  return readyPromise;
}

app.use(async (_req, _res, next) => {
  try {
    await ensureReady();
    next();
  } catch (error) {
    next(error);
  }
});

function cleanString(value) {
  return String(value || "").trim();
}

function escapeCsv(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, dbName: config.waitlistDbName });
});

app.get("/api/waitlist/stats", async (_req, res, next) => {
  try {
    const Entry = WaitlistEntry();
    const [total, jobSeekers, employers] = await Promise.all([
      Entry.countDocuments(),
      Entry.countDocuments({ role: "Job Seeker" }),
      Entry.countDocuments({ role: "Employer" })
    ]);

    res.json({ total, jobSeekers, employers });
  } catch (error) {
    next(error);
  }
});

app.post("/api/waitlist", async (req, res, next) => {
  try {
    const name = cleanString(req.body.name);
    const email = cleanString(req.body.email).toLowerCase();
    const role = cleanString(req.body.role);

    if (!name || !email || !role) {
      return res.status(400).json({ message: "Name, email, and role are required." });
    }

    if (!emailPattern.test(email)) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }

    if (!roles.has(role)) {
      return res.status(400).json({ message: "Please choose a valid waitlist role." });
    }

    const Entry = WaitlistEntry();
    const entry = await Entry.create({ name, email, role });

    res.status(201).json({
      message: "You are on the Nuvren waitlist.",
      entry: {
        id: entry._id,
        name: entry.name,
        email: entry.email,
        role: entry.role,
        createdAt: entry.createdAt
      }
    });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: "This email is already on the waitlist." });
    }

    next(error);
  }
});

app.post("/api/admin/login", (req, res) => {
  const username = cleanString(req.body.username);
  const password = cleanString(req.body.password);

  if (username !== config.adminUsername || password !== config.adminPassword) {
    return res.status(401).json({ message: "Invalid admin username or password." });
  }

  res.json({
    token: createAdminToken(username),
    username
  });
});

app.get("/api/admin/waitlist", requireAdmin, async (_req, res, next) => {
  try {
    const Entry = WaitlistEntry();
    const entries = await Entry.find().sort({ createdAt: -1 }).lean();

    res.json({
      total: entries.length,
      entries: entries.map((entry) => ({
        id: entry._id,
        name: entry.name,
        email: entry.email,
        role: entry.role,
        createdAt: entry.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/admin/waitlist.csv", requireAdmin, async (_req, res, next) => {
  try {
    const Entry = WaitlistEntry();
    const entries = await Entry.find().sort({ createdAt: -1 }).lean();
    const header = ["Name", "Email", "Role", "Signed Up At"];
    const rows = entries.map((entry) => [
      entry.name,
      entry.email,
      entry.role,
      entry.createdAt?.toISOString() || ""
    ]);
    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=\"nuvren-waitlist.csv\"");
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

const distPath = path.resolve(__dirname, "../dist");
app.use(express.static(distPath));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distPath, "index.html"));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: "Something went wrong. Please try again." });
});

export { app, ensureReady };

if (process.env.VERCEL !== "1") {
  await ensureReady();

  app.listen(config.port, () => {
    console.log(`Nuvren waitlist server running on http://localhost:${config.port}`);
    console.log(`Waitlist Mongo database: ${config.waitlistDbName}`);
  });
}
