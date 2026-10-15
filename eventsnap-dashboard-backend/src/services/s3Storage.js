import crypto from "crypto";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// AWS S3 storage for NEW Create Event photos (originals, unchanged bytes) in
// a PRIVATE bucket. Configured only through environment variables:
//   S3_PHOTO_BUCKET   bucket name (S3 is on only when this is set)
//   AWS_REGION        default ap-south-1 (Mumbai)
//   credentials       the AWS SDK's standard chain — AWS_ACCESS_KEY_ID /
//                     AWS_SECRET_ACCESS_KEY, or an IAM role when hosted on AWS
//   AWS_S3_ENDPOINT   testing only (an S3-compatible stand-in)
// Without S3_PHOTO_BUCKET, new photos keep going to MongoDB GridFS as before,
// and photos already in GridFS are never moved.
//
// Browsers never get credentials: photos are viewed through short-lived
// presigned GET URLs issued by the backend.

export const s3Enabled = () => !!process.env.S3_PHOTO_BUCKET;
const bucket = () => process.env.S3_PHOTO_BUCKET;

let client = null;
let clientKey = "";
const s3 = () => {
  const region = process.env.AWS_REGION || "ap-south-1";
  const endpoint = process.env.AWS_S3_ENDPOINT || undefined;
  const key = `${region}|${endpoint || ""}`;
  if (!client || key !== clientKey) {
    client = new S3Client({ region, ...(endpoint && { endpoint, forcePathStyle: true }) });
    clientKey = key;
  }
  return client;
};

// Photo URLs stored in MongoDB for S3 objects: "/api/create-events/photos/s3/<key>"
// (served by a redirect to a presigned GET URL — see streamS3Photo).
export const S3_URL_PREFIX = "/api/create-events/photos/s3/";

// u/<ownerId>/e/<eventId>/<random id>-<safe file name>, or
// u/<ownerId>/new/… for a cover uploaded while its event is being created.
// The owner/event parts organise the bucket; access is always checked in
// MongoDB (the event record holds the photo's URL), never from the key.
const KEY_PATTERN = /^u\/[0-9a-f]{24}\/(e\/[0-9a-f]{24}|new)\/[A-Za-z0-9_-]{22}-[A-Za-z0-9._-]{1,100}$/;
export const isS3Key = (key) => typeof key === "string" && KEY_PATTERN.test(key);
export const keyToUrl = (key) => `${S3_URL_PREFIX}${key}`;
export const keyFromUrl = (url) => {
  if (typeof url !== "string" || !url.startsWith(S3_URL_PREFIX)) return null;
  const key = url.slice(S3_URL_PREFIX.length);
  return isS3Key(key) ? key : null;
};

const safeFileName = (name) => {
  const raw = String(name || "photo").split(/[\\/]/).pop();
  const dot = raw.lastIndexOf(".");
  const ext = dot > 0 ? raw.slice(dot + 1).replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toLowerCase() : "";
  const base = (dot > 0 ? raw.slice(0, dot) : raw).replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^[._]+/, "").slice(0, 80) || "photo";
  return ext ? `${base}.${ext}` : base;
};

// A new unique, unguessable key (128 random bits) under the owner's prefix.
export const newKey = (ownerId, eventId, fileName) =>
  `u/${ownerId}/${/^[0-9a-f]{24}$/i.test(String(eventId || "")) ? `e/${String(eventId).toLowerCase()}` : "new"}/${crypto
    .randomBytes(16)
    .toString("base64url")}-${safeFileName(fileName)}`;
// The owner id a key was stored under.
export const ownerOfKey = (key) => (isS3Key(key) ? key.split("/")[1] : null);

export const putObject = (key, body, contentType) =>
  s3().send(new PutObjectCommand({ Bucket: bucket(), Key: key, Body: body, ContentType: contentType }));

export const presignGet = (key, expiresIn = 3600) =>
  getSignedUrl(s3(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn });

// { body (Node stream), size, contentType }, or null if missing.
export const getObject = async (key) => {
  try {
    const out = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: key }));
    return { body: out.Body, size: Number(out.ContentLength) || 0, contentType: out.ContentType || "" };
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === "NoSuchKey") return null;
    throw err;
  }
};

// Size in bytes, or null if the object doesn't exist. Throws on other errors.
export const headObjectSize = async (key) => {
  try {
    const out = await s3().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return Number(out.ContentLength) || 0;
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err?.name === "NotFound" || err?.name === "NoSuchKey") return null;
    throw err;
  }
};

// Never throws. true = the object is gone (deleting a missing object is a
// no-op success), false = S3 refused or couldn't be reached.
export const deleteObject = async (key) => {
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
    return true;
  } catch {
    return false;
  }
};
