"use client";

// Face recognition for Guest Access → Face Search, running entirely in the
// browser (@vladmandic/face-api). Models are served from /face-models (copied
// from the package) and loaded only when face search is actually used.
//
// - Photographer's dashboard: faceSignatures(photo) → one compact signature
//   per face (128-value descriptor quantised to 128 signed bytes, base64),
//   saved on the photo.
// - Guest page: selfieDescriptor(selfie) → the guest's 128-value descriptor,
//   computed on their device; only these numbers are sent for matching — the
//   selfie itself is never uploaded.

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";
const MODEL_URL = `${BASE_PATH}/face-models`;
// Must match the backend (createEventController QUANT_SCALE).
const QUANT_SCALE = 254;

let faceApiPromise = null;
const netPromises = {};

const loadNets = async (names) => {
  faceApiPromise ||= import("@vladmandic/face-api");
  const faceapi = await faceApiPromise;
  await faceapi.tf.ready();
  for (const name of names) {
    netPromises[name] ||= faceapi.nets[name].loadFromUri(MODEL_URL);
    await netPromises[name];
  }
  return faceapi;
};

// Decodes an image Blob onto a canvas no larger than maxSide. An <img> applies
// the photo's EXIF orientation, so phone photos come out upright.
const toCanvas = (blob, maxSide) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("This image format can't be read here"));
    };
    img.src = url;
  });

// A face that fills the whole photo (a close-up portrait or selfie) is often
// missed by the detectors; framing the image with a plain border fixes that.
// The face pixels are unchanged, so signatures stay comparable.
const withBorder = (canvas) => {
  const pad = Math.round(Math.max(canvas.width, canvas.height) * 0.3);
  const framed = document.createElement("canvas");
  framed.width = canvas.width + pad * 2;
  framed.height = canvas.height + pad * 2;
  const g = framed.getContext("2d");
  g.fillStyle = "#808080";
  g.fillRect(0, 0, framed.width, framed.height);
  g.drawImage(canvas, pad, pad);
  return framed;
};

const describeAll = (faceapi, input, options) =>
  faceapi.detectAllFaces(input, options).withFaceLandmarks().withFaceDescriptors();

const quantize = (descriptor) => {
  const bytes = new Int8Array(descriptor.length);
  for (let i = 0; i < descriptor.length; i++) {
    bytes[i] = Math.max(-127, Math.min(127, Math.round(descriptor[i] * QUANT_SCALE)));
  }
  let binary = "";
  for (const b of new Uint8Array(bytes.buffer)) binary += String.fromCharCode(b);
  return btoa(binary);
};

// Event photo → face signatures (empty array when no faces). Uses the more
// accurate detector, since event photos often have several small faces.
export const faceSignatures = async (blob) => {
  const faceapi = await loadNets(["ssdMobilenetv1", "tinyFaceDetector", "faceLandmark68Net", "faceRecognitionNet"]);
  const canvas = await toCanvas(blob, 1600);
  let results = await describeAll(faceapi, canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }));
  if (!results.length) {
    // Close-up portrait: retry framed, then with the other detector.
    const framed = withBorder(canvas);
    results = await describeAll(faceapi, framed, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 }));
    if (!results.length) {
      results = await describeAll(faceapi, framed, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }));
    }
  }
  return results.map((r) => quantize(r.descriptor));
};

// Selfie → the guest's descriptor (array of 128 numbers), or null if no face
// is found. Tries the small fast detector first (less to download on a
// phone), then the accurate one.
export const selfieDescriptor = async (blob, onStage) => {
  onStage?.("loading");
  let faceapi = await loadNets(["tinyFaceDetector", "faceLandmark68Net", "faceRecognitionNet"]);
  const canvas = await toCanvas(blob, 1024);
  onStage?.("detecting");
  const largest = (results) =>
    results.sort((a, b) => b.detection.box.area - a.detection.box.area)[0] || null;
  const tiny = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 });
  let face = largest(await describeAll(faceapi, canvas, tiny));
  // A selfie's face often fills the frame — retry framed, then with the
  // more accurate detector.
  if (!face) face = largest(await describeAll(faceapi, withBorder(canvas), tiny));
  if (!face) {
    faceapi = await loadNets(["ssdMobilenetv1"]);
    face = largest(await describeAll(faceapi, withBorder(canvas), new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 })));
  }
  return face ? Array.from(face.descriptor) : null;
};
