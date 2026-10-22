// Small gallery preview of a photo, made in the photographer's browser before
// upload. The original is always uploaded unchanged; this is sent alongside
// it so gallery tiles load tens of KB instead of the full photo.

const MAX_SIDE = 640;
const QUALITY = 0.78;
const MAX_BYTES = 1024 * 1024; // the backend refuses bigger "thumbnails"

// → JPEG Blob, or null when the browser can't decode the file (e.g. HEIC
// outside Safari) — the photo is then uploaded without one, as before.
export const makeThumbnail = async (file) => {
  let bitmap;
  try {
    bitmap = await createImageBitmap(file); // applies EXIF orientation
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    let blob;
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(w, h);
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, w, h);
      blob = await canvas.convertToBlob({ type: "image/jpeg", quality: QUALITY });
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, w, h);
      blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    }
    return blob && blob.size > 0 && blob.size <= MAX_BYTES ? blob : null;
  } catch {
    return null;
  } finally {
    bitmap?.close?.();
  }
};

// Runs fn over items with at most `limit` at a time (decoding big photos is
// memory-heavy, so only a couple at once).
export const createLimiter = (limit) => {
  let active = 0;
  const queue = [];
  const next = () => {
    if (active >= limit || !queue.length) return;
    active++;
    const { fn, resolve } = queue.shift();
    fn()
      .then(resolve, () => resolve(null))
      .finally(() => {
        active--;
        next();
      });
  };
  return (fn) =>
    new Promise((resolve) => {
      queue.push({ fn, resolve });
      next();
    });
};
