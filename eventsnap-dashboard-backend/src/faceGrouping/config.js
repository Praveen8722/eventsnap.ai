// "People" grouping settings (environment variables):
//   FACE_GROUPING_ENABLED=true   turns the feature on (off by default)
//   FACE_GROUPING_THRESHOLD      similarity (0–1, Human's measure) needed to
//                                put two faces in the same group; default 0.5.
//                                Higher = stricter (fewer wrong merges, more
//                                split groups). Tune with your own photos.
export const faceGroupingAvailable = () => process.env.FACE_GROUPING_ENABLED === "true";

export const matchThreshold = () => {
  const t = Number(process.env.FACE_GROUPING_THRESHOLD);
  return t >= 0.3 && t <= 0.95 ? t : 0.5;
};
