"use client";

import { useState } from "react";
import { FaInstagram } from "react-icons/fa";

// Strict Instagram Follow (Create Event → Guest Access): when it's on, guests
// open the photographer's Instagram profile and follow it before the event's
// photos are shown. "Continue" unlocks only after "Follow" has been tapped.
// Instagram offers no way for a website to check who follows an account, so
// the follow itself can't be verified here.
export function InstagramFollowGate({ handle, eventName, onContinue }) {
  const [opened, setOpened] = useState(false);
  const profileUrl = `https://www.instagram.com/${encodeURIComponent(handle)}/`;

  return (
    <div className="rounded-2xl border-2 border-[#6C63FF]/20 bg-white px-6 py-10 sm:py-12 text-center shadow-sm">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FEDA75] via-[#D62976] to-[#4F5BD5] text-white flex items-center justify-center mb-4">
        <FaInstagram className="text-3xl" />
      </div>
      <h2 className="text-xl font-bold text-[#1E1E1E]">Follow @{handle} on Instagram</h2>
      <p className="text-gray-600 mt-2 max-w-md mx-auto">
        Follow the photographer on Instagram to see the photos from {eventName}.
      </p>

      <div className="mt-6 max-w-sm mx-auto flex flex-col gap-2">
        <a
          href={profileUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setOpened(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#6C63FF] text-white font-semibold px-5 py-3 hover:bg-[#5B52EE] transition-colors"
        >
          <FaInstagram className="text-lg" />
          Follow @{handle}
        </a>
        <button
          type="button"
          onClick={onContinue}
          disabled={!opened}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-semibold px-5 py-3 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
        >
          I&apos;ve followed — show the photos
        </button>
      </div>
      {!opened && <p className="mt-3 text-xs text-gray-400">Tap “Follow @{handle}” first.</p>}
    </div>
  );
}
