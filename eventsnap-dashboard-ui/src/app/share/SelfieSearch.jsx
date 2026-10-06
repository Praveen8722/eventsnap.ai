"use client";

import { useRef, useState } from "react";
import { HiOutlineCamera, HiOutlineEmojiSad, HiOutlinePhotograph, HiOutlineShieldCheck } from "react-icons/hi";
import { searchEventFaces } from "@/api/createEventApi";
import { selfieDescriptor } from "@/app/create-event/faceEngine";

const STAGE_TEXT = {
  loading: "Getting face search ready… (the first time takes a moment)",
  detecting: "Looking for your face…",
  matching: "Finding your photos…",
};

// Guest selfie search for events with Guest Access → Face Search on. Shown
// as soon as the public event page opens: the guest takes a selfie (front
// camera on phones) or chooses one, it's analysed ON THEIR DEVICE, and only
// the resulting face descriptor is sent to find this event's photos of them.
// result: null before the first search, else { matches, indexed, total }.
export function SelfieSearch({ shareId, eventName, result, onResult }) {
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const [stage, setStage] = useState(null); // loading | detecting | matching
  const [error, setError] = useState("");
  const busy = !!stage;

  const search = async (file) => {
    if (!file) return;
    setError("");
    setStage("loading");
    try {
      const descriptor = await selfieDescriptor(file, setStage);
      if (!descriptor) {
        setError("We couldn't find a face in that photo. Try again with your face clearly visible and well lit.");
        return;
      }
      setStage("matching");
      const res = await searchEventFaces(shareId, descriptor);
      onResult({ matches: res.data.matches || [], indexed: res.data.indexed, total: res.data.total });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          (err?.message?.includes("format")
            ? "That photo's format can't be read here — try a JPG or take a new selfie."
            : "Couldn't search right now. Check your connection and try again.")
      );
    } finally {
      setStage(null);
    }
  };

  const inputs = (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="user"
        hidden
        aria-label="Take a selfie"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          search(f);
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        hidden
        aria-label="Choose a selfie"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          search(f);
        }}
      />
    </>
  );

  const buttons = (compact) => (
    <div className={`flex ${compact ? "flex-row" : "flex-col sm:flex-row"} gap-2 ${compact ? "" : "justify-center"}`}>
      <button
        type="button"
        onClick={() => cameraRef.current?.click()}
        disabled={busy}
        className={`inline-flex items-center justify-center gap-2 rounded-lg bg-[#6C63FF] text-white font-semibold hover:bg-[#5B52EE] disabled:opacity-60 transition-colors ${
          compact ? "px-3 py-1.5 text-sm" : "px-5 py-3"
        }`}
      >
        <HiOutlineCamera className={compact ? "text-base" : "text-lg"} />
        {compact ? "Try another selfie" : "Take a selfie"}
      </button>
      <button
        type="button"
        onClick={() => galleryRef.current?.click()}
        disabled={busy}
        className={`inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-60 transition-colors ${
          compact ? "px-3 py-1.5 text-sm" : "px-5 py-3"
        }`}
      >
        <HiOutlinePhotograph className={compact ? "text-base" : "text-lg"} />
        Choose a photo
      </button>
    </div>
  );

  const progress = busy && (
    <p className="mt-4 flex items-center justify-center gap-2 text-sm font-medium text-[#6C63FF]" role="status">
      <span className="w-4 h-4 rounded-full border-2 border-[#6C63FF] border-t-transparent animate-spin" />
      {STAGE_TEXT[stage]}
    </p>
  );
  const errorText = error && (
    <p role="alert" className="mt-3 text-sm text-red-500 text-center">
      {error}
    </p>
  );
  const partialNote =
    result && result.indexed < result.total ? (
      <p className="mt-2 text-xs text-gray-500">
        Some photos are still being prepared — check again later to see them all.
      </p>
    ) : null;

  // Before the first search: ask for a selfie straight away.
  if (!result) {
    return (
      <div className="rounded-2xl border-2 border-[#6C63FF]/20 bg-white px-6 py-10 sm:py-12 text-center shadow-sm">
        {inputs}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-[#6C63FF]/10 text-[#6C63FF] flex items-center justify-center mb-4">
          <HiOutlineCamera className="text-3xl" />
        </div>
        <h2 className="text-xl font-bold text-[#1E1E1E]">Find your photos</h2>
        <p className="text-gray-600 mt-2 max-w-md mx-auto">
          Take a quick selfie and we&apos;ll show you the photos you&apos;re in from {eventName}.
        </p>
        <div className="mt-6">{buttons(false)}</div>
        {progress}
        {errorText}
        <p className="mt-6 text-xs text-gray-400 flex items-center justify-center gap-1.5">
          <HiOutlineShieldCheck className="text-sm" />
          Your selfie stays on your device — it&apos;s only used to recognise you and is never uploaded.
        </p>
      </div>
    );
  }

  // No matches.
  if (!result.matches.length) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white px-6 py-12 text-center">
        {inputs}
        <HiOutlineEmojiSad className="mx-auto text-4xl text-gray-400" />
        <p className="font-semibold text-gray-800 mt-3">No matching photos found</p>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
          We couldn&apos;t find you in this event&apos;s photos. Try a clear, front-facing selfie in good light.
        </p>
        {partialNote}
        <div className="mt-5">{buttons(false)}</div>
        {progress}
        {errorText}
      </div>
    );
  }

  // Matches: a compact bar above the gallery.
  return (
    <div className="mb-4 rounded-xl border border-[#6C63FF]/20 bg-[#6C63FF]/5 px-4 py-3">
      {inputs}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-800">
          <span className="font-semibold">
            {result.matches.length} photo{result.matches.length === 1 ? "" : "s"} of you
          </span>{" "}
          from {eventName}
        </p>
        {buttons(true)}
      </div>
      {partialNote}
      {progress}
      {errorText}
    </div>
  );
}
