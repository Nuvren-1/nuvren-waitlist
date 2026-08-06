import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

export const config = {
  port: Number(process.env.PORT || 5000),
  mongoUri: process.env.MONGODB_URI,
  waitlistDbName: process.env.WAITLIST_DB_NAME || "nuvren_waitlist",
  adminUsername: process.env.ADMIN_USERNAME,
  adminPassword: process.env.ADMIN_PASSWORD,
  adminTokenSecret:
    process.env.ADMIN_TOKEN_SECRET ||
    `${process.env.ADMIN_PASSWORD || "nuvren"}-waitlist-admin-secret`
};

export function assertRequiredConfig() {
  const missing = [];

  if (!config.mongoUri) missing.push("MONGODB_URI");
  if (!config.adminUsername) missing.push("ADMIN_USERNAME");
  if (!config.adminPassword) missing.push("ADMIN_PASSWORD");

  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}
