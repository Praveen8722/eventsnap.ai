#!/usr/bin/env node
// EventSnap — Camera Auto Upload (desktop bridge)
//
// Watches a folder that your camera software saves new photos into and
// uploads each new photo to one Create Event, using the normal EventSnap
// login and photo upload API (photos land in the event's GridFS storage like
// any other upload). No extra packages — Node.js 20+ only.
//
// Connect the camera with its own app so new shots are saved to a folder:
//   Canon EOS Utility · Nikon NX Tether / SnapBridge · Sony Imaging Edge ·
//   Fujifilm X Acquire · gphoto2 --capture-tethered (Mac/Linux) ·
//   or the OS photo import from a USB card reader.
//
// Usage (from eventsnap-dashboard-backend):
//   node tools/camera-auto-upload.mjs --folder "C:\Photos\Tethered" --event <share id | event id | name>
//
// Options:
//   --folder <path>        folder to watch (sub-folders included)       [required]
//   --event <id>           event share id, id or exact name
//                          (omitted: the last event used, otherwise asked)
//   --api <url>            backend URL (default $EVENTSNAP_API_URL or http://localhost:8000)
//   --email <email>        account email (default $EVENTSNAP_EMAIL, asked if missing)
//                          password: $EVENTSNAP_PASSWORD, otherwise asked (hidden)
//   --include-existing     also upload photos already in the folder at start
//   --interval <seconds>   how often to check the folder (default 3)
//
// Only JPG/PNG/WebP/HEIC are uploaded (shoot RAW+JPEG). A file is uploaded
// once its size stops changing (so half-written files are never sent).
// Already-uploaded files are remembered per event in
// ~/.eventsnap-camera-upload/, and photos already in the event (same name +
// size) are skipped, so restarting never uploads duplicates.

import fs from "fs";
import os from "os";
import path from "path";
import readline from "readline";

const IMAGE_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".heic": "image/heic",
  ".heif": "image/heif",
};
const MAX_SIZE = 25 * 1024 * 1024; // backend per-file limit
const BATCH_MAX_FILES = 10;
const BATCH_MAX_BYTES = 40 * 1024 * 1024;
const MAX_DEPTH = 4;
const MAX_ATTEMPTS = 3;

// ---------------- arguments ----------------
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith("--")) continue;
  const key = a.slice(2);
  const next = process.argv[i + 1];
  if (next === undefined || next.startsWith("--")) args[key] = true;
  else args[key] = process.argv[++i];
}
const API = String(args.api || process.env.EVENTSNAP_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const FOLDER = args.folder && path.resolve(String(args.folder));
const INTERVAL_MS = Math.max(1, Number(args.interval) || 3) * 1000;
const INCLUDE_EXISTING = args["include-existing"] === true;

const log = (msg) => console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
const fatal = (msg) => {
  console.error(`Error: ${msg}`);
  process.exit(1);
};

if (!FOLDER) fatal('--folder is required, e.g. --folder "C:\\Photos\\Tethered"');
if (!fs.existsSync(FOLDER) || !fs.statSync(FOLDER).isDirectory()) fatal(`folder not found: ${FOLDER}`);

// ---------------- prompts ----------------
const ask = (question, { hidden = false } = {}) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => {
        if (s.includes(question)) rl.output.write(s);
      };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write("\n");
      resolve(answer.trim());
    });
  });

// ---------------- API ----------------
let token = null;
let credentials = null;

const login = async () => {
  const res = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) throw new Error(data.message || `login failed (${res.status})`);
  token = data.token;
};

// Authenticated request; signs in again once if the session expired.
const api = async (method, pathname, body, retried = false) => {
  const headers = { Authorization: `Bearer ${token}` };
  if (body && !(body instanceof FormData)) headers["Content-Type"] = "application/json";
  const res = await fetch(`${API}/api/create-events${pathname}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && !retried) {
    await login();
    return api(method, pathname, body, true);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.message || `request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
};

// ---------------- remembered uploads ----------------
const STATE_DIR = path.join(os.homedir(), ".eventsnap-camera-upload");
const stateFile = (eventId) => path.join(STATE_DIR, `${eventId}.json`);
const loadUploaded = (eventId) => {
  try {
    return new Set(JSON.parse(fs.readFileSync(stateFile(eventId), "utf8")));
  } catch {
    return new Set();
  }
};
// Last event used (per server) — stays the target until --event changes it.
const lastEventFile = path.join(STATE_DIR, "last-event.json");
const loadLastEvent = () => {
  try {
    return JSON.parse(fs.readFileSync(lastEventFile, "utf8"))[API] || null;
  } catch {
    return null;
  }
};
const saveLastEvent = (eventId) => {
  let all = {};
  try {
    all = JSON.parse(fs.readFileSync(lastEventFile, "utf8"));
  } catch {}
  all[API] = eventId;
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(lastEventFile, JSON.stringify(all));
};
const saveUploaded = (eventId, keys) => {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(stateFile(eventId), JSON.stringify([...keys].slice(-50000)));
};

// ---------------- folder scan ----------------
const listImages = (dir, depth = 0, out = []) => {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (depth < MAX_DEPTH) listImages(full, depth + 1, out);
      continue;
    }
    const type = IMAGE_TYPES[path.extname(entry.name).toLowerCase()];
    if (!type || !entry.isFile()) continue;
    try {
      const st = fs.statSync(full);
      out.push({ full, name: entry.name, type, size: st.size, mtime: st.mtimeMs });
    } catch {
      // Removed between listing and stat.
    }
  }
  return out;
};

const toBatches = (list) => {
  const batches = [];
  let current = [];
  let bytes = 0;
  for (const item of list) {
    if (current.length && (current.length >= BATCH_MAX_FILES || bytes + item.size > BATCH_MAX_BYTES)) {
      batches.push(current);
      current = [];
      bytes = 0;
    }
    current.push(item);
    bytes += item.size;
  }
  if (current.length) batches.push(current);
  return batches;
};

// ---------------- main ----------------
const main = async () => {
  credentials = {
    email: String(args.email || process.env.EVENTSNAP_EMAIL || (await ask("EventSnap email: "))),
    password: process.env.EVENTSNAP_PASSWORD || (await ask("Password: ", { hidden: true })),
  };
  try {
    await login();
  } catch (err) {
    fatal(`couldn't sign in to ${API}: ${err.message}`);
  }

  const { events = [] } = await api("GET", "/");
  if (!events.length) fatal("this account has no Create Events yet — create one in the dashboard first");
  let event;
  if (args.event) {
    const q = String(args.event).toLowerCase();
    const matches = events.filter((e) => e.id === args.event || e.slug === q || e.name.toLowerCase() === q);
    if (matches.length > 1) fatal(`more than one event is named "${args.event}" — use its share id instead`);
    event = matches[0];
    if (!event) fatal(`no event matches "${args.event}" (use the share id, event id or exact name)`);
  } else if ((event = events.find((e) => e.id === loadLastEvent()))) {
    log(`Using the last event, "${event.name}" (pass --event to change it).`);
  } else {
    events.forEach((e, i) => console.log(`  ${i + 1}. ${e.name}  (${e.date}, share id ${e.slug})`));
    const pick = Number(await ask("Upload to which event? Number: "));
    event = events[pick - 1];
    if (!event) fatal("invalid choice");
  }

  saveLastEvent(event.id);
  const { photos = [] } = await api("GET", `/${event.id}/photos`);
  const inEvent = new Set(photos.map((p) => `${p.originalName}|${p.size}`));
  const uploaded = loadUploaded(event.id);
  const skip = new Set();
  const pending = new Map(); // full path -> { size, mtime }
  const failures = new Map(); // key -> { attempts, nextTry, error }
  let uploadedCount = 0;
  let baseline = !INCLUDE_EXISTING;

  log(`Signed in. Watching ${FOLDER}`);
  log(`Uploading new photos to "${event.name}" (share id ${event.slug}). Press Ctrl+C to stop.`);

  const keyOf = (f) => `${f.full}|${f.size}|${f.mtime}`;

  const send = async (batch) => {
    const form = new FormData();
    for (const f of batch) {
      form.append("photos", new Blob([await fs.promises.readFile(f.full)], { type: f.type }), f.name);
    }
    await api("POST", `/${event.id}/photos`, form);
    for (const f of batch) {
      uploaded.add(f.key);
      inEvent.add(`${f.name}|${f.size}`);
      failures.delete(f.key);
    }
    uploadedCount += batch.length;
    saveUploaded(event.id, uploaded);
    log(`Uploaded ${batch.length}: ${batch.map((f) => f.name).join(", ")}  (total ${uploadedCount})`);
  };

  const recordFailure = (f, err) => {
    const prev = failures.get(f.key) || { attempts: 0 };
    const attempts = prev.attempts + 1;
    const permanent = attempts >= MAX_ATTEMPTS || err.status === 400;
    failures.set(f.key, { attempts: permanent ? MAX_ATTEMPTS : attempts, nextTry: Date.now() + 15000 * attempts, error: err.message });
    log(`Failed ${f.name}: ${err.message}${permanent ? " — giving up on this file" : " — will retry"}`);
  };

  const cycle = async () => {
    const ready = [];
    for (const f of listImages(FOLDER)) {
      f.key = keyOf(f);
      if (uploaded.has(f.key) || skip.has(f.key)) continue;
      if (baseline || inEvent.has(`${f.name}|${f.size}`)) {
        skip.add(f.key);
        continue;
      }
      const failure = failures.get(f.key);
      if (failure && (failure.attempts >= MAX_ATTEMPTS || Date.now() < failure.nextTry)) continue;
      if (f.size > MAX_SIZE) {
        if (!failure) recordFailure(f, Object.assign(new Error("larger than 25 MB"), { status: 400 }));
        continue;
      }
      const seen = pending.get(f.full);
      if (seen && seen.size === f.size && seen.mtime === f.mtime) {
        pending.delete(f.full);
        ready.push(f);
      } else {
        pending.set(f.full, { size: f.size, mtime: f.mtime });
      }
    }
    if (baseline) {
      baseline = false;
      if (skip.size) log(`Skipping ${skip.size} photo(s) already in the folder (use --include-existing to upload them).`);
    }

    // Photos added to the event meanwhile (by hand, a phone, another
    // computer) aren't uploaded again.
    if (ready.length) {
      try {
        const { photos: current = [] } = await api("GET", `/${event.id}/photos`);
        for (const p of current) inEvent.add(`${p.originalName}|${p.size}`);
      } catch {
        // Offline — the upload below fails and is retried later.
      }
      for (let i = ready.length - 1; i >= 0; i--) {
        if (inEvent.has(`${ready[i].name}|${ready[i].size}`)) {
          skip.add(ready[i].key);
          ready.splice(i, 1);
        }
      }
    }

    for (const batch of toBatches(ready)) {
      try {
        await send(batch);
      } catch (err) {
        if (err.status === 404) fatal(`event "${event.name}" no longer exists`);
        if (batch.length === 1) {
          recordFailure(batch[0], err);
          continue;
        }
        // One at a time so a single bad file only fails itself.
        for (const f of batch) {
          try {
            await send([f]);
          } catch (single) {
            if (single.status === 404) fatal(`event "${event.name}" no longer exists`);
            recordFailure(f, single);
          }
        }
      }
    }
  };

  let running = false;
  const loop = async () => {
    if (!running) {
      running = true;
      try {
        await cycle();
      } catch (err) {
        log(`Problem: ${err.message} — trying again shortly`);
      } finally {
        running = false;
      }
    }
    setTimeout(loop, INTERVAL_MS);
  };
  process.on("SIGINT", () => {
    log(`Stopped. ${uploadedCount} photo(s) uploaded this session.`);
    process.exit(0);
  });
  loop();
};

main().catch((err) => fatal(err.message));
