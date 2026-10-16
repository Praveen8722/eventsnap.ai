// Storage quota ledger against a local MongoDB test database
// (STORAGE_QUOTA_TEST_MONGO_URL, default mongodb://localhost:27017/
// eventSnapDB_quotaUnitTest — dropped afterwards). Skipped when no MongoDB is
// reachable. Uses GridFS photos only (no S3 needed).
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import CreateEvent from "../models/CreateEvent.js";
import { PendingPhotoDeletion, StorageUsage } from "../models/StorageUsage.js";
import * as quota from "./storageQuota.js";

const URL = process.env.STORAGE_QUOTA_TEST_MONGO_URL || "mongodb://localhost:27017/eventSnapDB_quotaUnitTest";
const GB = 1024 ** 3;
const MB = 1024 ** 2;
let connected = false;

before(async () => {
  delete process.env.STORAGE_QUOTA_GB;
  try {
    await mongoose.connect(URL, { serverSelectionTimeoutMS: 1500 });
    assert.match(mongoose.connection.name, /quotaUnitTest/);
    await mongoose.connection.dropDatabase();
    await Promise.all([StorageUsage.init(), PendingPhotoDeletion.init()]);
    connected = true;
  } catch {
    await mongoose.disconnect().catch(() => {});
  }
});
after(async () => {
  if (connected) await mongoose.connection.dropDatabase();
  await mongoose.disconnect().catch(() => {});
  delete process.env.STORAGE_QUOTA_GB;
});

const newUser = () => new mongoose.Types.ObjectId();
const gridUrl = () => `/api/create-events/photos/${new mongoose.Types.ObjectId()}`;
const addGridFile = async (url, length, user) =>
  mongoose.connection.collection("createEventPhotos.files").insertOne({
    _id: new mongoose.Types.ObjectId(url.split("/").pop()),
    length,
    chunkSize: 261120,
    uploadDate: new Date(),
    filename: "x.jpg",
    metadata: { user: String(user) },
  });
const mkEvent = (user, photos = [], coverPhoto = "") =>
  CreateEvent.create({ user, name: "E", date: "2026-12-01", slug: `e-${new mongoose.Types.ObjectId()}`, photos, coverPhoto });

describe("storage quota", { skip: false }, () => {
  test("quota is configurable, default 3 GB", (t) => {
    assert.equal(quota.quotaBytesFor(), 3 * GB);
    process.env.STORAGE_QUOTA_GB = "10";
    assert.equal(quota.quotaBytesFor(), 10 * GB);
    for (const bad of ["nonsense", "", "0", "-1"]) {
      process.env.STORAGE_QUOTA_GB = bad;
      assert.equal(quota.quotaBytesFor(), 3 * GB, bad);
    }
    delete process.env.STORAGE_QUOTA_GB;
  });

  test("new photographer: 0 used, 3 GB limit", async (t) => {
    if (!connected) return t.skip("no MongoDB");
    const u = await quota.getStorageUsage(newUser());
    assert.deepEqual(u, { usedBytes: 0, reservedBytes: 0, limitBytes: 3 * GB, availableBytes: 3 * GB });
  });

  test("reserve → commit counts; release frees the hold; error message names the plan size", async (t) => {
    if (!connected) return t.skip("no MongoDB");
    const user = newUser();
    const a = await quota.reserve(user, 2 * GB);
    assert.equal((await quota.getStorageUsage(user)).reservedBytes, 2 * GB);
    await assert.rejects(quota.reserve(user, 1.5 * GB), (e) => e instanceof quota.StorageQuotaError && e.message === "Storage limit reached. Your plan includes 3 GB. Delete some photos to upload more.");
    await quota.commit(user, [{ id: a, bytes: 2 * GB }]);
    let u = await quota.getStorageUsage(user);
    assert.deepEqual([u.usedBytes, u.reservedBytes], [2 * GB, 0]);
    const b = await quota.reserve(user, GB); // exactly fills the quota
    await quota.release(user, [b]);
    u = await quota.getStorageUsage(user);
    assert.deepEqual([u.usedBytes, u.reservedBytes, u.availableBytes], [2 * GB, 0, GB]);
    await assert.rejects(quota.reserve(user, GB + 1), quota.StorageQuotaError);
  });

  test("photographers have independent quotas", async (t) => {
    if (!connected) return t.skip("no MongoDB");
    const [x, y] = [newUser(), newUser()];
    await quota.commit(x, [{ id: await quota.reserve(x, 3 * GB), bytes: 3 * GB }]);
    await assert.rejects(quota.reserve(x, 1), quota.StorageQuotaError);
    const h = await quota.reserve(y, 3 * GB);
    assert.ok(h);
    assert.equal((await quota.getStorageUsage(x)).usedBytes, 3 * GB);
    assert.equal((await quota.getStorageUsage(y)).reservedBytes, 3 * GB);
  });

  test("100 parallel 100 MB reservations against 3 GB → exactly 30 accepted", async (t) => {
    if (!connected) return t.skip("no MongoDB");
    const user = newUser();
    const results = await Promise.allSettled(Array.from({ length: 100 }, () => quota.reserve(user, 100 * MB)));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    assert.equal(ok, Math.floor((3 * GB) / (100 * MB)));
    assert.ok(results.filter((r) => r.status === "rejected").every((r) => r.reason instanceof quota.StorageQuotaError));
    const u = await quota.getStorageUsage(user);
    assert.ok(u.reservedBytes <= u.limitBytes);
  });

  test("free never goes below zero", async (t) => {
    if (!connected) return t.skip("no MongoDB");
    const user = newUser();
    await quota.commit(user, [{ id: await quota.reserve(user, 10 * MB), bytes: 10 * MB }]);
    await quota.free(user, 50 * MB);
    assert.equal((await quota.getStorageUsage(user)).usedBytes, 0);
  });

  test("expired holds (crashed upload) stop counting", async (t) => {
    if (!connected) return t.skip("no MongoDB");
    const user = newUser();
    await quota.reserve(user, 3 * GB);
    await StorageUsage.updateOne({ user }, { $set: { "holds.0.at": new Date(Date.now() - 2 * 60 * 60 * 1000) } });
    assert.ok(await quota.reserve(user, GB));
  });

  test("existing photos (GridFS + recorded sizes) are counted once when the ledger starts; pending deletions still count", async (t) => {
    if (!connected) return t.skip("no MongoDB");
    const user = newUser();
    const other = newUser();
    const g1 = gridUrl(); // gallery photo without a recorded size → GridFS length
    const g2 = gridUrl(); // gallery photo with size, also the cover (counted once)
    const cover = gridUrl(); // separate cover → GridFS length
    await addGridFile(g1, 7 * MB, user);
    await addGridFile(g2, 5 * MB, user);
    await addGridFile(cover, 2 * MB, user);
    await mkEvent(user, [{ url: g1, originalName: "a", size: 0 }, { url: g2, originalName: "b", size: 5 * MB }], g2);
    await mkEvent(user, [], cover);
    await PendingPhotoDeletion.create({ user, url: gridUrl(), bytes: 3 * MB });
    // Another photographer's photos never count.
    const o = gridUrl();
    await addGridFile(o, 100 * MB, other);
    await mkEvent(other, [{ url: o, originalName: "o", size: 100 * MB }]);
    assert.equal((await quota.getStorageUsage(user)).usedBytes, 17 * MB);
    assert.equal((await quota.getStorageUsage(other)).usedBytes, 100 * MB);
  });

  test("reconcile: fixes drift; never while an upload holds space; version guard stops a stale count", async (t) => {
    if (!connected) return t.skip("no MongoDB");
    const user = newUser();
    const g = gridUrl();
    await addGridFile(g, 4 * MB, user);
    await mkEvent(user, [{ url: g, originalName: "a", size: 4 * MB }]);
    await quota.getStorageUsage(user);
    await StorageUsage.updateOne({ user }, { $set: { used: 999 } });
    // A live reservation: left alone, nothing changed.
    const hold = await quota.reserve(user, MB);
    assert.deepEqual(await quota.reconcileStorageUsage(user), { status: "busy" });
    let doc = await StorageUsage.findOne({ user }).lean();
    assert.deepEqual([doc.used, doc.holds.length], [999, 1]);
    await quota.release(user, [hold]);
    // The ledger changes while counting (an upload commits) → not applied.
    const r = await quota.reconcileStorageUsage(user, {
      afterCalculate: async () => quota.commit(user, [{ id: await quota.reserve(user, MB), bytes: MB }]),
    });
    assert.equal(r.status, "changed");
    assert.equal((await StorageUsage.findOne({ user }).lean()).used, 999 + MB);
    // Quiet → applied.
    assert.deepEqual(await quota.reconcileStorageUsage(user), { status: "updated", before: 999 + MB, after: 4 * MB });
    doc = await StorageUsage.findOne({ user }).lean();
    assert.ok(doc.reconciledAt);
  });

  test("reconcile after a crash mid-upload: expired hold dropped, saved photo counted", async (t) => {
    if (!connected) return t.skip("no MongoDB");
    const user = newUser();
    await quota.getStorageUsage(user);
    // Upload reserved 6 MB, saved the photo, then the process died before commit.
    await quota.reserve(user, 6 * MB);
    const g = gridUrl();
    await addGridFile(g, 6 * MB, user);
    await mkEvent(user, [{ url: g, originalName: "a", size: 6 * MB }]);
    await StorageUsage.updateOne({ user }, { $set: { "holds.0.at": new Date(Date.now() - 2 * 60 * 60 * 1000) } });
    assert.ok((await quota.ledgersToReconcile(1000)).some((u) => String(u) === String(user)));
    assert.equal((await quota.reconcileStorageUsage(user)).status, "updated");
    const doc = await StorageUsage.findOne({ user }).lean();
    assert.deepEqual([doc.used, doc.holds.length], [6 * MB, 0]);
  });

  test("reconcile counts a file once whether it's a gallery photo, the cover and pending deletion at the same time", async (t) => {
    if (!connected) return t.skip("no MongoDB");
    const user = newUser();
    const g = gridUrl();
    await addGridFile(g, 8 * MB, user);
    await mkEvent(user, [{ url: g, originalName: "a", size: 8 * MB }], g);
    await PendingPhotoDeletion.create({ user, url: g, bytes: 8 * MB });
    await quota.getStorageUsage(user);
    await StorageUsage.updateOne({ user }, { $set: { used: 0 } });
    assert.equal((await quota.reconcileStorageUsage(user)).after, 8 * MB);
  });
});

describe("deletion retries (background maintenance)", () => {
  let storage;
  before(async () => {
    storage = await import("./createEventPhotoStorage.js");
  });
  const gridExists = async (url) =>
    !!(await mongoose.connection.collection("createEventPhotos.files").findOne({ _id: new mongoose.Types.ObjectId(url.split("/").pop()) }));
  const due = (user, url, bytes, extra = {}) => PendingPhotoDeletion.create({ user, url, bytes, nextAttemptAt: new Date(0), ...extra });

  test("a file that is (again / still) used by an event is never deleted; its record is dropped, nothing freed", async (t) => {
    if (!connected) return t.skip("no MongoDB");
    const user = newUser();
    const g = gridUrl();
    await addGridFile(g, 5 * MB, user);
    await mkEvent(user, [{ url: g, originalName: "a", size: 5 * MB }]);
    await quota.getStorageUsage(user);
    await due(user, g, 5 * MB);
    await storage.runStorageMaintenance();
    assert.ok(await gridExists(g));
    assert.equal(await PendingPhotoDeletion.countDocuments({ user }), 0);
    assert.equal((await StorageUsage.findOne({ user }).lean()).used, 5 * MB);
  });

  test("an unreferenced pending file is deleted and freed exactly once, even with parallel runs", async (t) => {
    if (!connected) return t.skip("no MongoDB");
    const user = newUser();
    const g = gridUrl();
    await addGridFile(g, 5 * MB, user);
    await mkEvent(user, []);
    await due(user, g, 5 * MB); // crash after recording, before the event change finished
    await quota.getStorageUsage(user); // ledger counts it (pending)
    assert.equal((await StorageUsage.findOne({ user }).lean()).used, 5 * MB);
    await Promise.all([storage.runStorageMaintenance(), storage.runStorageMaintenance(), storage.runStorageMaintenance()]);
    assert.equal(await gridExists(g), false);
    assert.equal(await PendingPhotoDeletion.countDocuments({ user }), 0);
    assert.equal((await StorageUsage.findOne({ user }).lean()).used, 0);
  });

  test("a deletion that keeps failing stays recorded (attempts, backoff) and stays counted", async (t) => {
    if (!connected) return t.skip("no MongoDB");
    const user = newUser();
    const g = gridUrl();
    await addGridFile(g, 5 * MB, newUser()); // not this user's file → can't be deleted
    await mkEvent(user, []);
    await due(user, g, 5 * MB);
    await quota.getStorageUsage(user);
    await storage.runStorageMaintenance();
    const p = await PendingPhotoDeletion.findOne({ user }).lean();
    assert.equal(p.attempts, 1);
    assert.ok(p.nextAttemptAt > new Date());
    assert.ok(await gridExists(g));
    assert.equal((await StorageUsage.findOne({ user }).lean()).used, 5 * MB);
  });

  test("a stale claim (process died while freeing) is dropped without freeing again, then a recount fixes usage", async (t) => {
    if (!connected) return t.skip("no MongoDB");
    const user = newUser();
    const keep = gridUrl();
    await addGridFile(keep, 3 * MB, user);
    await mkEvent(user, [{ url: keep, originalName: "k", size: 3 * MB }]);
    await quota.getStorageUsage(user); // used = 3 MB
    // Died after claiming + freeing a 5 MB file, before removing its record.
    const g = gridUrl();
    await due(user, g, 5 * MB, { claimedAt: new Date(Date.now() - 60 * 60 * 1000) });
    // An upload in progress: the recount must wait, so a second free would show.
    const hold = await quota.reserve(user, MB);
    await storage.runStorageMaintenance();
    assert.equal(await PendingPhotoDeletion.countDocuments({ user }), 0);
    let doc = await StorageUsage.findOne({ user }).lean();
    assert.equal(doc.used, 3 * MB, "freed twice");
    assert.equal(doc.reconciledAt, null); // recount requested, still pending (busy)
    assert.equal(doc.holds.length, 1); // the live reservation is untouched
    // Upload finished → next run recounts.
    await quota.release(user, [hold]);
    await storage.runStorageMaintenance();
    doc = await StorageUsage.findOne({ user }).lean();
    assert.equal(doc.used, 3 * MB);
    assert.ok(doc.reconciledAt);
  });
});
