"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  HiCheckCircle,
  HiExclamationCircle,
  HiOutlineCamera,                    
  HiOutlineCloudUpload,
  HiOutlineEye,
  HiOutlinePhotograph,
  HiOutlinePlus,
  HiOutlineQrcode,   
  HiOutlineSearch,
  HiOutlineShare, 
  HiOutlineSparkles,
} from "react-icons/hi";
import {
  createEvent as apiCreateEvent,
  deleteEvent as apiDeleteEvent,   
  deleteEventPhoto,
  getEvent,
  getMyEvents,
  removeEventCover,
  updateEvent,
  setEventCoverFromPhoto,
  uploadEventCover,
} from "@/api/createEventApi";
import { apiError, fromApi, photoCount, publicGalleryUrl, settingsToApi } from "./mockData";
import { primaryBtn } from "./ModalShell";
import { EventCard } from "./EventCard";
import { EventGallery } from "./EventGallery";
import { CreateEventModal } from "./CreateEventModal";
import { UploadPhotosModal } from "./UploadPhotosModal";
import { ShareQrModal } from "./ShareQrModal";
import { useCameraAutoUpload } from "./useCameraAutoUpload";
import { useFaceIndexer } from "./useFaceIndexer";
import { usePhoneUpload } from "./usePhoneUpload";
import { SharedPhotosInbox, registerShareTarget } from "./SharedPhotosInbox";

// Events are loaded from and saved to the backend (api/createEventApi.js);
// the list keeps each event's latest server copy.

const FILTERS = ["All", "Live", "Draft"];

const STEPS = [
  { icon: HiOutlineSparkles, label: "Create event" },
  { icon: HiOutlineQrcode, label: "QR generated" },
  { icon: HiOutlineCloudUpload, label: "Upload photos" },
  { icon: HiOutlineShare, label: "Share with guests" },
];

function useToast() {
  // { message, tone: "success" | "error" }
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const show = useCallback((message, tone = "success") => {
    setToast({ message, tone });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), tone === "error" ? 4000 : 2400);
  }, []);
  return { toast, show };
}

function EmptyState({ onCreate }) {
  return (
    <div className="mt-6 bg-white rounded-2xl border-2 border-dashed border-gray-200 px-6 py-14 sm:py-20 flex flex-col items-center text-center">
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-3xl bg-linear-to-br from-[#6C63FF] to-[#A23EFF] flex items-center justify-center shadow-lg shadow-[#6C63FF]/25 -rotate-6">
          <HiOutlineCamera className="text-5xl text-white rotate-6" />
        </div>
        <div className="absolute -right-4 -bottom-3 w-12 h-12 rounded-2xl bg-white border border-gray-100 shadow-md flex items-center justify-center rotate-[8deg]">
          <HiOutlinePhotograph className="text-2xl text-[#FF5555]" />
        </div>
      </div>
      <h2 className="text-xl font-bold text-[#1E1E1E]">Create your first event</h2>
      <p className="text-gray-500 text-sm mt-2 max-w-md">
        Every event gets its own QR code. Upload your photos and guests can scan, view and download them instantly.
      </p>
      <button type="button" onClick={onCreate} className={`${primaryBtn} mt-6 px-6`}>
        <HiOutlinePlus className="text-lg" />
        Create Event
      </button>
    </div>
  );
}

function LoadingCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 mt-6" aria-busy="true" aria-label="Loading events">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border-2 border-gray-200 overflow-hidden bg-white animate-pulse">
          <div className="aspect-16/10 bg-gray-100" />
          <div className="p-4 space-y-2">
            <div className="h-4 w-2/3 rounded bg-gray-100" />
            <div className="h-3 w-1/3 rounded bg-gray-100" />
            <div className="h-9 mt-4 rounded-lg bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function Photoshare() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [openEventId, setOpenEventId] = useState(null);
  // { type: "create" } | { type: "upload", id } | { type: "share", id }
  const [modal, setModal] = useState(null);
  // Id of the event whose cover is being saved (shows a busy overlay).
  const [coverBusyId, setCoverBusyId] = useState(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const { toast, show } = useToast();

  const findEvent = (id) => events.find((e) => e.id === id);
  const openEvent = findEvent(openEventId);
  const modalEvent = modal?.id ? findEvent(modal.id) : null;
  const closeModal = useCallback(() => setModal(null), []);

  const loadEvents = useCallback(async () => {
    try {
      const res = await getMyEvents();
      setEvents((res.data?.events || []).map(fromApi));
      setLoadError("");
    } catch (error) {
      setLoadError(apiError(error, "Couldn't load your events."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const retryLoad = () => {
    setLoading(true);
    setLoadError("");
    loadEvents();
  };

  // Replace an event with the server's latest copy. A list-shaped copy (no
  // photos) keeps the photos already loaded.
  const mergeEvent = useCallback((serverEvent) => {
    const next = fromApi(serverEvent);
    setEvents((prev) =>
      prev.map((e) => (e.id === next.id ? { ...next, photos: next.photos ?? e.photos } : e))
    );
  }, []);

  // Camera Auto Upload — kept here so it keeps running while moving between
  // the event list and galleries; new photos land in the event via mergeEvent.
  const camera = useCameraAutoUpload({ onSaved: mergeEvent });
  // Face Search: prepare face signatures for events that have it on.
  const setFaceIndexed = useCallback(
    (eventId, count) =>
      setEvents((prev) =>
        prev.map((e) => (e.id === eventId && e.faceIndexedCount !== count ? { ...e, faceIndexedCount: count } : e))
      ),
    []
  );
  const faceProgress = useFaceIndexer({ events, onIndexed: setFaceIndexed });
  // Phones: gallery picker + Android "Share → EventSnap" (shared inbox).
  const phone = usePhoneUpload({ onSaved: mergeEvent });
  useEffect(() => {
    registerShareTarget();
  }, []);
  const cameraEvent = camera.state.status === "watching" ? findEvent(camera.state.eventId) : null;
  // Remembered target that was running but needs a click to continue after a
  // refresh (the browser asks to allow the folder again).
  const cameraPaused =
    camera.supported && camera.remembered?.active && camera.state.status !== "watching" ? camera.remembered : null;

  // Always re-fetches, so photos and statistics (guest views, downloads) are
  // current every time an event is opened. Already-loaded photos stay on
  // screen meanwhile.
  const openGallery = async (event) => {
    setOpenEventId(event.id);
    try {
      const res = await getEvent(event.id);
      mergeEvent(res.data.event);
    } catch (error) {
      show(apiError(error, "Couldn't load this event's photos."), "error");
      if (!event.photos) setOpenEventId(null);
    }
  };

  // Called by the create form; throws (with the server's message) on failure
  // so the form can show it.
  const createEvent = async ({ name, date, location, settings, coverFile }) => {
    let res;
    try {
      res = await apiCreateEvent({ name, date, location, ...settingsToApi(settings) }, coverFile);
    } catch (error) {
      throw new Error(apiError(error, "Couldn't create the event. Please try again."));
    }
    const event = fromApi(res.data.event);
    setEvents((prev) => [event, ...prev]);
    setFilter("All");
    setQuery("");
    // Straight to the QR — step two of the flow.
    setModal({ type: "share", id: event.id });
    show("Event created — QR code generated");
  };

  const handleUploadDone = useCallback(
    (count) => {
      setModal(null);
      show(`${count} photo${count === 1 ? "" : "s"} uploaded`);
    },
    [show]
  );

  const removePhoto = async (eventId, photoId) => {
    if (!window.confirm("Delete this photo? Guests will no longer see it.")) return;
    try {
      const res = await deleteEventPhoto(eventId, photoId);
      mergeEvent(res.data.event);
      show("Photo deleted");
    } catch (error) {
      show(apiError(error, "Couldn't delete the photo."), "error");
    }
  };

  // Saves a cover change; `request` is the API call to make.
  const saveCover = async (eventId, request, successMessage) => {
    setCoverBusyId(eventId);
    try {
      const res = await request();
      mergeEvent(res.data.event);
      show(successMessage);
    } catch (error) {
      show(apiError(error, "Couldn't update the cover photo."), "error");
    } finally {
      setCoverBusyId(null);
    }
  };

  // `file` is a newly picked cover image; null removes the cover.
  const setCover = (eventId, file) =>
    file
      ? saveCover(eventId, () => uploadEventCover(eventId, file), "Cover photo updated")
      : saveCover(eventId, () => removeEventCover(eventId), "Cover photo removed");

  const setCoverFromPhoto = (eventId, photoId) =>
    saveCover(eventId, () => setEventCoverFromPhoto(eventId, photoId), "Cover photo updated");

  // Partial settings update from the gallery's Guest Access panel. Resolves
  // true on success (the panel then shows the saved values).
  const updateSettings = async (eventId, patch) => {
    try {
      const res = await updateEvent(eventId, patch);
      mergeEvent(res.data.event);
      show("Guest access updated");
      return true;
    } catch (error) {
      show(apiError(error, "Couldn't save the setting."), "error");
      return false;
    }
  };

  const deleteEvent = async (event) => {
    if (!window.confirm(`Delete "${event.name}"? Its QR code and gallery link will stop working.`)) return;
    try {
      await apiDeleteEvent(event.id);
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
      if (openEventId === event.id) setOpenEventId(null);
      show("Event deleted");
    } catch (error) {
      show(apiError(error, "Couldn't delete the event."), "error");
    }
  };

  const copyLink = async (event) => {
    try {
      await navigator.clipboard.writeText(publicGalleryUrl(event.slug));
      show("Gallery link copied");
    } catch {
      window.prompt("Copy the gallery link:", publicGalleryUrl(event.slug));
    }
  };

  const visible = events.filter(
    (e) =>
      (filter === "All" || e.status === filter) &&
      (!query.trim() || `${e.name} ${e.location}`.toLowerCase().includes(query.trim().toLowerCase()))
  );

  const totals = {
    events: events.length,
    photos: events.reduce((s, e) => s + photoCount(e), 0),
    views: events.reduce((s, e) => s + (e.views || 0), 0),
  };

  return (
    <>
      {!loading && (
        <div className="mt-4 -mb-4">
          <SharedPhotosInbox events={events} phone={phone} onOpenEvent={(id) => { const e = findEvent(id); if (e) openGallery(e); }} />
        </div>
      )}
      {openEvent ? (
        <EventGallery
          event={openEvent}
          onBack={() => setOpenEventId(null)}
          onUpload={() => setModal({ type: "upload", id: openEvent.id })}
          onShare={() => setModal({ type: "share", id: openEvent.id })}
          onRemovePhoto={(photoId) => removePhoto(openEvent.id, photoId)}
          onSetCover={(file) => setCover(openEvent.id, file)}
          onSetCoverPhoto={(photoId) => setCoverFromPhoto(openEvent.id, photoId)}
          onUpdateSettings={(patch) => updateSettings(openEvent.id, patch)}
          coverBusy={coverBusyId === openEvent.id}
          camera={camera}
          phone={phone}
          faceProgress={faceProgress}
        />
      ) : (
        <div className="mt-4">
          {cameraEvent && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm">
              <span className="flex items-center gap-2 text-green-800">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Camera auto upload is running for <span className="font-semibold">{cameraEvent.name}</span>
                {camera.state.uploaded > 0 && ` · ${camera.state.uploaded} uploaded`}
              </span>
              <span className="flex items-center gap-3">
                <button type="button" onClick={() => openGallery(cameraEvent)} className="font-semibold text-green-800 hover:underline">
                  Open event
                </button>
                <button type="button" onClick={camera.stop} className="font-semibold text-red-600 hover:underline">
                  Stop
                </button>
              </span>
            </div>
          )}
          {cameraPaused && !cameraEvent && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm">
              <span className="text-amber-800">
                Camera auto upload to <span className="font-semibold">{cameraPaused.eventName}</span> is paused after the
                page reloaded.
              </span>
              <button type="button" onClick={camera.resume} className="font-semibold text-amber-900 hover:underline">
                Resume
              </button>
            </div>
          )}
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#1E1E1E]">Create Event</h1>
              <p className="text-gray-600 mt-0.5">Create events, upload photos, and share them instantly with guests.</p>
            </div>
            <button type="button" onClick={() => setModal({ type: "create" })} className={`${primaryBtn} sm:px-5 shrink-0`}>
              <HiOutlinePlus className="text-lg" />
              Create Event
            </button>
          </div>

          {loading ? (
            <LoadingCards />
          ) : loadError ? (
            <div className="mt-6 rounded-2xl border-2 border-dashed border-gray-200 py-12 px-6 text-center">
              <p className="text-sm text-red-500">{loadError}</p>
              <button type="button" onClick={retryLoad} className={`${primaryBtn} mt-4`}>
                Try again
              </button>
            </div>
          ) : (
            <>
              {/* Overview strip: totals + how it works — always shown, also with 0 events */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mt-6">
                <div className="lg:col-span-2 grid grid-cols-3 gap-3">
                  {[
                    { label: "Events", value: totals.events, icon: HiOutlineSparkles, color: "bg-[#6C63FF]" },
                    { label: "Photos", value: totals.photos, icon: HiOutlinePhotograph, color: "bg-[#3A7BFF]" },
                    { label: "Guest views", value: totals.views, icon: HiOutlineEye, color: "bg-[#22C55E]" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="bg-white rounded-xl border-2 border-gray-200 p-3 sm:p-4">
                      <div className={`w-9 h-9 rounded-lg ${color} text-white flex items-center justify-center`}>
                        <Icon className="text-lg" />
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-[#1E1E1E] mt-2">{value.toLocaleString("en-IN")}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="lg:col-span-3 rounded-xl border-2 border-[#6C63FF]/15 bg-linear-to-r from-[#6C63FF]/6 to-[#FF5555]/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-[#6C63FF]">How it works</p>
                  <ol className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                    {STEPS.map(({ icon: Icon, label }, i) => (
                      <li key={label} className="flex items-center gap-2.5">
                        <div className="relative w-9 h-9 shrink-0 rounded-lg bg-white border border-gray-100 shadow-sm text-[#6C63FF] flex items-center justify-center">
                          <Icon className="text-lg" />
                          <span className="absolute -top-1.5 -left-1.5 w-4 h-4 rounded-full bg-[#6C63FF] text-white text-[10px] font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 leading-tight">{label}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              {events.length === 0 ? (
                <EmptyState onCreate={() => setModal({ type: "create" })} />
              ) : (
                <>
                  {/* Toolbar */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-8">
                    <div className="inline-flex rounded-lg bg-gray-100 p-1 w-fit">
                      {FILTERS.map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFilter(f)}
                          className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                            filter === f ? "bg-white text-[#6C63FF] shadow-sm" : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <div className="relative sm:w-72">
                      <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search events"
                        className="w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-[#6C63FF] focus:ring-2 focus:ring-[#6C63FF]/20 transition"
                      />
                    </div>
                  </div>

                  {visible.length === 0 ? (
                    <div className="mt-4 rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center text-sm text-gray-500">
                      No events match your filters.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 mt-4">
                      {visible.map((event) => (
                        <EventCard
                          key={event.id}
                          event={event}
                          onOpen={() => openGallery(event)}
                          onUpload={() => setModal({ type: "upload", id: event.id })}
                          onShare={() => setModal({ type: "share", id: event.id })}
                          onCopyLink={() => copyLink(event)}
                          onDelete={() => deleteEvent(event)}
                          onSetCover={(file) => setCover(event.id, file)}
                          coverBusy={coverBusyId === event.id}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {modal?.type === "create" && <CreateEventModal onClose={closeModal} onCreate={createEvent} />}
      {modal?.type === "upload" && modalEvent && (
        <UploadPhotosModal event={modalEvent} onClose={closeModal} onSaved={mergeEvent} onDone={handleUploadDone} />
      )}
      {modal?.type === "share" && modalEvent && <ShareQrModal event={modalEvent} onClose={closeModal} />}

      {toast && (
        <div
          role="status"
          className="fixed z-70 bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 rounded-full bg-[#1E1E1E] text-white text-sm font-medium pl-3 pr-4 py-2.5 shadow-xl"
        >
          {toast.tone === "error" ? (
            <HiExclamationCircle className="text-lg text-red-400 shrink-0" />
          ) : (
            <HiCheckCircle className="text-lg text-green-400 shrink-0" />
          )}
          <span className="max-w-[80vw] truncate">{toast.message}</span>
        </div>
      )}
    </>
  );
}
