"use client";

import { useCallback, useEffect, useState } from "react";
import { HiOutlineRefresh, HiOutlineUserGroup, HiX } from "react-icons/hi";
import { createEventAssetUrl } from "@/api/createEventApi";
import { disableFaceGroups, enableFaceGroups, getFaceGroups, getPersonPhotos, retryFaceGroups } from "@/api/faceGroupsApi";
import { Toggle } from "./CreateEventModal";
import { secondaryBtn } from "./ModalShell";
import { apiError } from "./mockData";

// Event gallery → People: the event's photos grouped by person (a free face
// library running in the background on the server). Photographer-only;
// guests never see it. Hidden when the server hasn't enabled it.
// onOpenPhoto(photoId) opens a photo in the gallery's lightbox.

const POLL_MS = 10000;

// A round face thumbnail cut from the photo with CSS (no face image is
// created or stored). box = the face's position as fractions of the photo.
const faceStyle = (url, box) => {
  const w = Math.max(box?.width || 1, 0.01);
  const h = Math.max(box?.height || 1, 0.01);
  const x = w >= 1 ? 0 : ((box?.left || 0) / (1 - w)) * 100;
  const y = h >= 1 ? 0 : ((box?.top || 0) / (1 - h)) * 100;
  return {
    backgroundImage: `url("${createEventAssetUrl(url)}")`,
    backgroundSize: `${100 / w}% ${100 / h}%`,
    backgroundPosition: `${Math.min(Math.max(x, 0), 100)}% ${Math.min(Math.max(y, 0), 100)}%`,
  };
};

export function PeoplePanel({ event, onOpenPhoto }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [person, setPerson] = useState(null); // { id, photos }

  const load = useCallback(async () => {
    try {
      setData((await getFaceGroups(event.id)).data);
    } catch (err) {
      setError(apiError(err, "Couldn't load people."));
    }
  }, [event.id]);

  useEffect(() => {
    // Fetch on open (state is only set once the request resolves).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const working = data?.enabled && (!data.ready || data.progress?.waiting > 0);
  // While on (or being removed), refresh regularly: picks up progress and
  // photos added or deleted since.
  const live = !!(data?.enabled || data?.removing);
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    return () => clearInterval(id);
  }, [live, load]);

  if (!data?.available) return null;

  const run = async (request) => {
    setBusy(true);
    setError("");
    try {
      setData((await request()).data);
    } catch (err) {
      setError(apiError(err, "Something went wrong. Please try again."));
    }
    setBusy(false);
  };

  const toggle = (on) => {
    if (on) {
      const ok = window.confirm(
        "Group this event's photos by person?\n\n" +
          "Faces are found on the EventSnap server — no outside face service is used. The face data is kept only for this event, " +
          "is never shown to guests, and is deleted when you turn this off or delete the event.\n\n" +
          "Grouping is approximate: one person may appear in more than one group, and some faces may not be grouped."
      );
      if (ok) run(() => enableFaceGroups(event.id));
    } else {
      if (window.confirm("Turn off grouping and delete this event's face data? Turning it on again processes all photos again.")) {
        setPerson(null);
        run(() => disableFaceGroups(event.id));
      }
    }
  };

  const openPerson = async (id) => {
    try {
      setPerson({ id, photos: (await getPersonPhotos(event.id, id)).data.photos });
    } catch (err) {
      setError(apiError(err, "Couldn't load this person's photos."));
    }
  };

  const p = data.progress;
  const done = p ? p.indexed + p.noFaces + p.unsupported + p.failed : 0;
  const status = !data.enabled
    ? data.removing
      ? { label: "Removing", tone: "bg-gray-100 text-gray-600" }
      : { label: "Off", tone: "bg-gray-100 text-gray-500" }
    : working
      ? { label: "Processing…", tone: "bg-sky-100 text-sky-700" }
      : { label: "Completed", tone: "bg-green-100 text-green-700" };

  return (
    <div className="bg-white rounded-2xl border-2 border-gray-200 p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-bold text-[#1E1E1E] flex items-center gap-2">
          <HiOutlineUserGroup className="text-lg text-[#6C63FF]" />
          People
        </h2>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${status.tone}`}>{status.label}</span>
      </div>
      <p className="text-sm text-gray-500 mt-1">See this event&apos;s photos grouped by person (approximate). Only you can see this.</p>

      <div className="flex items-center justify-between gap-3 mt-4">
        <span className="text-sm font-medium text-gray-700">Group photos by person</span>
        <Toggle checked={!!data.enabled} onChange={toggle} label="Group photos by person" disabled={busy || data.removing} />
      </div>
      {data.removing && <p className="text-xs text-gray-500 mt-2">Deleting this event&apos;s face data…</p>}

      {data.enabled && p && (
        <>
          <p className="text-xs text-gray-500 mt-3">
            {data.ready ? `Processed ${done} of ${p.total} photo${p.total === 1 ? "" : "s"}` : "Setting up…"}
            {data.people.length > 0 && ` · ${data.people.length} ${data.people.length === 1 ? "person" : "people"}`}
          </p>
          {(p.noFaces > 0 || p.unsupported > 0 || p.failed > 0) && (
            <p className="text-xs text-gray-400 mt-1">
              {[
                p.noFaces && `${p.noFaces} with no faces`,
                p.unsupported && `${p.unsupported} unsupported format (e.g. HEIC)`,
                p.failed && `${p.failed} failed`,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {data.lastError && <p className="text-xs text-amber-700 mt-1">{data.lastError}</p>}
          {p.failed > 0 && (
            <button type="button" onClick={() => run(() => retryFaceGroups(event.id))} disabled={busy} className={`${secondaryBtn} w-full mt-3`}>
              <HiOutlineRefresh className="text-lg" />
              Retry {p.failed} failed
            </button>
          )}

          {person ? (
            <div className="mt-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">
                  {person.photos.length} photo{person.photos.length === 1 ? "" : "s"} of this person
                </p>
                <button type="button" onClick={() => setPerson(null)} aria-label="Back to people" className="text-gray-400 hover:text-gray-600">
                  <HiX />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {person.photos.map((ph) => (
                  <button
                    key={ph.id}
                    type="button"
                    onClick={() => onOpenPhoto?.(ph.id)}
                    aria-label="Open photo"
                    className="aspect-square rounded-lg overflow-hidden bg-gray-100"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={createEventAssetUrl(ph.url)} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            data.people.length > 0 && (
              <div className="grid grid-cols-4 gap-3 mt-3">
                {data.people.map((pp) => (
                  <button key={pp.id} type="button" onClick={() => openPerson(pp.id)} className="flex flex-col items-center gap-1" aria-label="Show this person's photos">
                    <span className="w-14 h-14 rounded-full bg-gray-100 bg-no-repeat border-2 border-white shadow" style={pp.cover ? faceStyle(pp.cover.url, pp.cover.box) : undefined} />
                    <span className="text-[11px] text-gray-500">{pp.photoCount}</span>
                  </button>
                ))}
              </div>
            )
          )}
        </>
      )}
      {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
    </div>
  );
}
