"use client";

import { useEffect, useRef, useState } from "react";
import { createEventAssetUrl, getEventPhotos, saveFaceSignatures } from "@/api/createEventApi";
import { faceSignatures } from "./faceEngine";

const SAVE_EVERY = 8; // photos per save request
const RETRY_MS = 60000; // after a network problem

const needsWork = (e) => e.settings?.faceSearch && e.photoCount > (e.faceIndexedCount || 0);

// Keeps Guest Access → Face Search ready. While the Create Event page is
// open, every event with Face Search on gets its not-yet-processed photos
// (new uploads from any source — dashboard, auto upload, bridge, Android)
// turned into face signatures in this browser and saved on the photos.
// onIndexed(eventId, indexedCount) keeps the page's counts in step.
export function useFaceIndexer({ events, onIndexed }) {
  const [progress, setProgress] = useState(null); // { eventId, done, total }
  const [retryTick, setRetryTick] = useState(0);
  const eventsRef = useRef(events);
  const onIndexedRef = useRef(onIndexed);
  const running = useRef(false);
  const stopped = useRef(false);
  const unreadable = useRef(new Set()); // photos this browser couldn't process

  useEffect(() => {
    eventsRef.current = events;
    onIndexedRef.current = onIndexed;
  });
  useEffect(
    () => () => {
      stopped.current = true;
    },
    []
  );

  const pendingKey = events
    .filter(needsWork)
    .map((e) => `${e.id}:${e.photoCount}:${e.faceIndexedCount}`)
    .join(",");

  useEffect(() => {
    if (!pendingKey || running.current) return;
    running.current = true;
    stopped.current = false;

    const run = async () => {
      // "eventId:photoCount" with nothing more this browser can do — new
      // uploads change photoCount, so they're picked up in the same pass.
      const settled = new Set();
      const keyOf = (e) => `${e.id}:${e.photoCount}`;
      let networkTrouble = false;
      for (;;) {
        if (stopped.current) return;
        const event = eventsRef.current.find((e) => needsWork(e) && !settled.has(keyOf(e)));
        if (!event) break;

        let photos;
        try {
          photos = (await getEventPhotos(event.id)).data?.photos || [];
        } catch {
          networkTrouble = true;
          break;
        }
        let indexed = photos.filter((p) => p.faceIndexed).length;
        const todo = photos.filter((p) => !p.faceIndexed && !unreadable.current.has(p.id));
        onIndexedRef.current?.(event.id, indexed);
        if (!todo.length) {
          settled.add(keyOf(event));
          continue;
        }

        let batch = [];
        const save = async () => {
          if (!batch.length) return;
          await saveFaceSignatures(event.id, batch);
          indexed += batch.length;
          batch = [];
          onIndexedRef.current?.(event.id, indexed);
        };
        try {
          for (let i = 0; i < todo.length; i++) {
            if (stopped.current) return;
            setProgress({ eventId: event.id, done: i, total: todo.length });
            const photo = todo[i];
            const res = await fetch(createEventAssetUrl(photo.url));
            if (res.status === 404) continue; // deleted meanwhile
            if (!res.ok) throw new Error("network");
            try {
              batch.push({ id: photo.id, faces: await faceSignatures(await res.blob()) });
            } catch {
              unreadable.current.add(photo.id); // e.g. a format this browser can't decode
            }
            if (batch.length >= SAVE_EVERY) await save();
          }
          await save();
        } catch {
          networkTrouble = true;
          break;
        }
        settled.add(keyOf(event));
      }
      setProgress(null);
      running.current = false;
      if (stopped.current) return;
      if (networkTrouble) setTimeout(() => setRetryTick((t) => t + 1), RETRY_MS);
      // Photos that arrived just as this pass finished.
      else if (eventsRef.current.some((e) => needsWork(e) && !settled.has(keyOf(e)))) setRetryTick((t) => t + 1);
    };

    run().catch(() => {
      setProgress(null);
      running.current = false;
    });
  }, [pendingKey, retryTick]);

  return progress;
}
