import mongoose from "mongoose";
import { getWaitlistConnection } from "../db.js";

const waitlistEntrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
      maxlength: 254
    },
    role: {
      type: String,
      enum: ["Job Seeker", "Employer"],
      required: true
    }
  },
  {
    timestamps: true
  }
);

export function WaitlistEntry() {
  const connection = getWaitlistConnection();
  return connection.models.WaitlistEntry || connection.model("WaitlistEntry", waitlistEntrySchema);
}
