import CreateEvent from "../models/CreateEvent.js";
import { DirectCameraConfig, DirectCameraUpload } from "../models/DirectCamera.js";
import { hashPassword, newPassword, newUsername } from "../directCamera/credentials.js";
import { maxUploadBytes } from "../directCamera/ingest.js";

// Create Event → Direct Camera Auto Upload (owner only). Separate from the
// folder-based Camera Auto Upload. Credentials are event-scoped; the
// password is returned only when it's created or regenerated, and is never
// stored or sent back otherwise.

const notFound = (res) => res.status(404).json({ success: false, message: "Event not found" });
const serverError = (res) => res.status(500).json({ success: false, message: "Server Error" });

const ownEvent = async (req) => {
  const id = req.params.eventId;
  if (!/^[0-9a-f]{24}$/i.test(id)) return null;
  return CreateEvent.findOne({ _id: id, user: req.userId }).select("_id user").lean();
};

// Where cameras connect (the ingestion service's public address). Unset →
// the service isn't deployed, and the dashboard says so.
const serviceInfo = () => {
  const host = process.env.DIRECT_CAMERA_HOST || "";
  const port = Number(process.env.DIRECT_CAMERA_PORT) || 0;
  return {
    available: !!(host && port),
    host,
    port,
    protocol: "FTPS (explicit TLS)",
    passiveMode: true,
    maxFileMb: Math.round(maxUploadBytes() / 1024 / 1024),
    formats: ["JPEG", "HEIF/HEIC", "PNG"],
  };
};

const serializeConfig = (c) =>
  c && {
    enabled: !!c.enabled,
    username: c.username,
    credentialsCreatedAt: c.credentialsCreatedAt,
    lastLoginAt: c.lastLoginAt,
    lastFailedLoginAt: c.lastFailedLoginAt,
    lastUploadAt: c.lastUploadAt,
    lastError: c.lastError?.message ? c.lastError : null,
    stats: {
      received: c.stats?.received || 0,
      duplicates: c.stats?.duplicates || 0,
      rejected: c.stats?.rejected || 0,
      failed: c.stats?.failed || 0,
    },
  };

const respond = async (res, config, extra = {}) => {
  const recent = config
    ? await DirectCameraUpload.find({ event: config.event }).sort({ createdAt: -1 }).limit(15).lean()
    : [];
  res.status(200).json({
    success: true,
    service: serviceInfo(),
    config: serializeConfig(config),
    recent: recent.map((u) => ({ fileName: u.fileName, size: u.size, status: u.status, reason: u.reason, at: u.createdAt })),
    ...extra,
  });
};

// GET /api/direct-camera/:eventId
export const getDirectCamera = async (req, res) => {
  try {
    const event = await ownEvent(req);
    if (!event) return notFound(res);
    const config = await DirectCameraConfig.findOne({ event: event._id }).lean();
    await respond(res, config);
  } catch {
    serverError(res);
  }
};

// POST /api/direct-camera/:eventId/enable — turns it on; the first time,
// creates the camera login and returns its password once.
export const enableDirectCamera = async (req, res) => {
  try {
    const event = await ownEvent(req);
    if (!event) return notFound(res);
    let config = await DirectCameraConfig.findOne({ event: event._id });
    let password;
    if (!config) {
      password = newPassword();
      for (let attempt = 0; ; attempt++) {
        try {
          config = await DirectCameraConfig.create({
            event: event._id,
            user: event.user,
            enabled: true,
            username: newUsername(),
            ...hashPassword(password),
            credentialsCreatedAt: new Date(),
          });
          break;
        } catch (error) {
          // Username collision (or a parallel enable for this event).
          if (error?.code !== 11000 || attempt >= 4) throw error;
          const existing = await DirectCameraConfig.findOne({ event: event._id });
          if (existing) {
            config = existing;
            password = undefined;
            break;
          }
        }
      }
    }
    if (!config.enabled) {
      config.enabled = true;
      await config.save();
    }
    await respond(res, config.toObject(), password ? { password } : {});
  } catch {
    serverError(res);
  }
};

// POST /api/direct-camera/:eventId/disable — the camera can no longer log in
// or upload (sessions already open are refused on their next file).
export const disableDirectCamera = async (req, res) => {
  try {
    const event = await ownEvent(req);
    if (!event) return notFound(res);
    const config = await DirectCameraConfig.findOneAndUpdate(
      { event: event._id },
      { $set: { enabled: false } },
      { returnDocument: "after" }
    ).lean();
    await respond(res, config);
  } catch {
    serverError(res);
  }
};

// POST /api/direct-camera/:eventId/credentials — new password (the old one
// stops working immediately, including open sessions); returned once.
export const regenerateDirectCameraPassword = async (req, res) => {
  try {
    const event = await ownEvent(req);
    if (!event) return notFound(res);
    const password = newPassword();
    const config = await DirectCameraConfig.findOneAndUpdate(
      { event: event._id },
      { $set: { ...hashPassword(password), credentialsCreatedAt: new Date(), lastFailedLoginAt: null } },
      { returnDocument: "after" }
    ).lean();
    if (!config) return res.status(400).json({ success: false, message: "Turn on Direct Camera Auto Upload first" });
    await respond(res, config, { password });
  } catch {
    serverError(res);
  }
};
