import crypto from "node:crypto";
import { config } from "./config.js";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 12;

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(value) {
  return crypto.createHmac("sha256", config.adminTokenSecret).update(value).digest("base64url");
}

export function createAdminToken(username) {
  const payload = JSON.stringify({
    sub: username,
    exp: Date.now() + TOKEN_TTL_MS
  });
  const encodedPayload = base64Url(payload);

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

export function verifyAdminToken(token) {
  if (!token || !token.includes(".")) return null;

  const [encodedPayload, signature] = token.split(".");
  const expectedSignature = sign(encodedPayload);
  const providedSignature = Buffer.from(signature || "");
  const expectedSignatureBuffer = Buffer.from(expectedSignature);

  if (providedSignature.length !== expectedSignatureBuffer.length) return null;

  if (!crypto.timingSafeEqual(providedSignature, expectedSignatureBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function requireAdmin(req, res, next) {
  const authorization = req.get("authorization") || "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const payload = verifyAdminToken(token);

  if (!payload) {
    return res.status(401).json({ message: "Admin login required." });
  }

  req.admin = payload;
  return next();
}
