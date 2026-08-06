import mongoose from "mongoose";
import { config } from "./config.js";

let waitlistConnection;

export async function connectWaitlistDatabase() {
  if (waitlistConnection?.readyState === 1) {
    return waitlistConnection;
  }

  waitlistConnection = await mongoose.createConnection(config.mongoUri, {
    dbName: config.waitlistDbName
  }).asPromise();

  return waitlistConnection;
}

export function getWaitlistConnection() {
  if (!waitlistConnection) {
    throw new Error("Waitlist database connection has not been initialized.");
  }

  return waitlistConnection;
}
