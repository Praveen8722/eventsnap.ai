import sharp from "sharp";

// The temporary image face detection works on: decoded from the stored
// original, turned upright using its EXIF orientation, scaled down to at most
// MAX_SIDE px on its longest side, as raw RGB pixels. Lives only in memory for
// one photo; the stored original is never changed.
//
// Formats: whatever this sharp build decodes — JPEG, PNG, WebP, AVIF, TIFF,
// GIF. iPhone HEIC (HEVC) is NOT decodable by the bundled libheif (no HEVC
// decoder), so such photos are reported as unsupported.
const MAX_SIDE = 1920;
// Refuse absurd dimensions before decoding (decompression bombs): 100 MP.
const MAX_INPUT_PIXELS = 100_000_000;

export class UnsupportedImageError extends Error {}

// → { data: Buffer (RGB), width, height }
export const processingImage = async (bytes) => {
  try {
    const { data, info } = await sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
      .rotate() // apply EXIF orientation
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .removeAlpha()
      .toColourspace("srgb")
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.channels !== 3) throw new Error(`unexpected ${info.channels} channels`);
    return { data, width: info.width, height: info.height };
  } catch (err) {
    const msg = String(err?.message || "");
    const heic = /hevc|heif|libde265/i.test(msg);
    throw new UnsupportedImageError(
      heic ? "HEIC photos can't be read for grouping on this server" : "This photo's format can't be read for grouping"
    );
  }
};
