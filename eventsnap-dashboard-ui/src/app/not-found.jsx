"use client";

import { useEffect, useState } from "react";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || "";

// On the static GitHub Pages build this becomes 404.html, which Pages serves
// for any path it has no file for — including every shared /p/<slug>
// portfolio, /g/<slug> gallery and /share/<slug> event link. Those are
// forwarded to the equivalent /p, /g or /share ?slug=<slug> page so existing
// links and QR codes keep working. Anything else is a normal "not found".
const legacyPublicLink = () => {
  let path = window.location.pathname;
  if (BASE_PATH && path.startsWith(BASE_PATH)) path = path.slice(BASE_PATH.length);
  const match = path.match(/^\/(p|g|share)\/([^/]+)\/?$/);
  if (!match) return null;
  // Trailing slash: the static build serves each page as <route>/index.html.
  return `${BASE_PATH}/${match[1]}/?slug=${match[2]}`;
};

export default function NotFound() {
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    const target = legacyPublicLink();
    if (target) window.location.replace(target);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    else setRedirecting(false);
  }, []);

  if (redirecting) return null;

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
      <p className="text-gray-700 font-semibold">Page not found</p>
      <p className="text-gray-400 text-sm mt-1">
        This link is invalid or the page was removed.
      </p>
    </div>
  );
}
