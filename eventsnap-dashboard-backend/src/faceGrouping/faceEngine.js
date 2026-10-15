import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath, pathToFileURL } from "url";

// Face detection + descriptors for "People" grouping, on this server with
// the free @vladmandic/human library (MIT) and TensorFlow.js' WASM backend —
// no cloud service, no native build. Loaded once, on first use.
//
// Two Node quirks are handled here:
//   • Human's package "exports" map can't resolve its Node-WASM build by name,
//     so the file is loaded by path;
//   • that build loads model files with fetch(), and Node's fetch can't read
//     file:// URLs — reads of Human's own models folder are served from disk.

const require = createRequire(import.meta.url);
// Located through node_modules lookup paths (its "exports" map blocks even
// "@vladmandic/human/package.json").
const HUMAN_DIR = require.resolve
  .paths("@vladmandic/human")
  .map((dir) => path.join(dir, "@vladmandic", "human"))
  .find((dir) => fs.existsSync(path.join(dir, "package.json")));
const WASM_DIR = path.join(path.dirname(require.resolve("@tensorflow/tfjs-backend-wasm/package.json")), "dist");
const MODELS_DIR = path.join(HUMAN_DIR, "models");
const dirUrl = (dir) => `${pathToFileURL(dir).href}/`;

let installedFetchShim = false;
const installFetchShim = () => {
  if (installedFetchShim) return;
  installedFetchShim = true;
  const realFetch = globalThis.fetch;
  const modelsUrl = dirUrl(MODELS_DIR);
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input?.url;
    // Only Human's model files — everything else uses the normal fetch.
    if (typeof url === "string" && url.startsWith(modelsUrl)) {
      const file = fileURLToPath(url);
      if (!file.startsWith(MODELS_DIR)) return new Response(null, { status: 404 });
      return new Response(await fs.promises.readFile(file), { status: 200 });
    }
    return realFetch(input, init);
  };
};

let enginePromise = null;
const loadEngine = async () => {
  installFetchShim();
  const wasm = require("@tensorflow/tfjs-backend-wasm");
  wasm.setWasmPaths(dirUrl(WASM_DIR));
  const lib = require(path.join(HUMAN_DIR, "dist", "human.node-wasm.js"));
  const Human = lib.Human || lib.default;
  const human = new Human({
    backend: "wasm",
    wasmPath: dirUrl(WASM_DIR),
    modelBasePath: dirUrl(MODELS_DIR),
    debug: false,
    async: false,
    cacheSensitivity: 0, // every photo is different — no frame cache
    face: {
      enabled: true,
      detector: { rotation: true, maxDetected: 30, minConfidence: 0.5, return: false },
      mesh: { enabled: true }, // aligns each face for its descriptor
      iris: { enabled: false },
      description: { enabled: true }, // the descriptor used for matching
      emotion: { enabled: false },
      antispoof: { enabled: false },
      liveness: { enabled: false },
      attention: { enabled: false },
    },
    body: { enabled: false },
    hand: { enabled: false },
    object: { enabled: false },
    gesture: { enabled: false },
    segmentation: { enabled: false },
  });
  await human.load();
  return human;
};
const engine = () => {
  if (!enginePromise) enginePromise = loadEngine().catch((err) => {
    enginePromise = null; // retry the load next time
    throw err;
  });
  return enginePromise;
};

// Faces in an RGB image: [{ box: {left, top, width, height} (fractions),
// score, descriptor: Float32Array }]. Faces without a descriptor are skipped.
export const detectFaces = async ({ data, width, height }) => {
  const human = await engine();
  const tensor = human.tf.tensor(new Uint8Array(data.buffer, data.byteOffset, data.byteLength), [1, height, width, 3], "int32");
  try {
    const result = await human.detect(tensor);
    return result.face
      .filter((f) => f.embedding?.length)
      .map((f) => ({
        box: { left: f.boxRaw[0], top: f.boxRaw[1], width: f.boxRaw[2], height: f.boxRaw[3] },
        score: f.score,
        descriptor: Float32Array.from(f.embedding),
      }));
  } finally {
    tensor.dispose();
  }
};

// A function comparing two descriptors → 0 (different) … 1 (identical), using
// Human's own measure (so the threshold means what Human documents).
export const matcher = async () => {
  const human = await engine();
  return (a, b) => human.match.similarity(a, b);
};

// For monitoring: tensors held by TensorFlow (should stay flat over time).
export const tensorCount = async () => (await engine()).tf.memory().numTensors;
