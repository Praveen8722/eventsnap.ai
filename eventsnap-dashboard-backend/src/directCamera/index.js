import fs from "fs";
import tls from "tls";
import crypto from "crypto";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { createFtpsServer } from "./ftpsServer.js";

// Direct Camera Auto Upload — ingestion service (separate process from the
// HTTP API; `npm run direct-camera`). Cameras upload over FTPS to it; it
// stores photos in the same MongoDB / GridFS as the API, so they appear in
// the event's gallery. The HTTP API host (Render) can't accept FTP, so this
// runs on a host with open TCP ports — see .env.example "Direct Camera".

dotenv.config({ quiet: true });

const env = (name, fallback) => process.env[name] ?? fallback;
const fail = (message) => {
  console.error(`[direct-camera] ${message}`);
  process.exit(1);
};

const port = Number(env("DIRECT_CAMERA_FTP_PORT", 2121));
const [pasvPortMin, pasvPortMax] = String(env("DIRECT_CAMERA_PASV_PORTS", "30000-30009")).split("-").map(Number);
const pasvAddress = env("DIRECT_CAMERA_PASV_ADDRESS", "") || undefined;
const certFile = env("DIRECT_CAMERA_TLS_CERT", "");
const keyFile = env("DIRECT_CAMERA_TLS_KEY", "");

if (!process.env.MONGO_URL) fail("MONGO_URL is not set");
if (!certFile || !keyFile) fail("DIRECT_CAMERA_TLS_CERT and DIRECT_CAMERA_TLS_KEY are required (FTPS only — no plain FTP)");
if (!(pasvPortMin > 0 && pasvPortMax >= pasvPortMin)) fail("DIRECT_CAMERA_PASV_PORTS must look like 30000-30009");
if (pasvAddress && !/^\d{1,3}(\.\d{1,3}){3}$/.test(pasvAddress)) fail("DIRECT_CAMERA_PASV_ADDRESS must be the server's public IPv4 address");

let secureContext;
let dataSecureContext;
try {
  const cert = fs.readFileSync(certFile);
  const key = fs.readFileSync(keyFile);
  // Shared session tickets, so a data connection can resume the control
  // connection's TLS session (some FTPS clients expect it).
  const ticketKeys = crypto.randomBytes(48);
  secureContext = tls.createSecureContext({ cert, key, minVersion: "TLSv1.2", ticketKeys });
  // Data connections: TLS 1.2 (see ftpsServer.js — clean close_notify).
  dataSecureContext = tls.createSecureContext({ cert, key, minVersion: "TLSv1.2", maxVersion: "TLSv1.2", ticketKeys });
} catch (error) {
  fail(`Can't load the TLS certificate/key: ${error.message}`);
}

await mongoose.connect(process.env.MONGO_URL).catch((error) => fail(`MongoDB connection failed: ${error.message}`));
console.log("[direct-camera] MongoDB connected");

const server = createFtpsServer({ secureContext, dataSecureContext, pasvAddress, pasvPortMin, pasvPortMax });
server.on("error", (error) => fail(`FTPS server error: ${error.message}`));
server.listen(port, () =>
  console.log(`[direct-camera] FTPS listening on ${port} (passive ${pasvPortMin}-${pasvPortMax}${pasvAddress ? ` via ${pasvAddress}` : ""})`)
);

const shutdown = () => {
  console.log("[direct-camera] shutting down");
  server.close();
  mongoose.disconnect().finally(() => process.exit(0));
  setTimeout(() => process.exit(0), 5000).unref();
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
