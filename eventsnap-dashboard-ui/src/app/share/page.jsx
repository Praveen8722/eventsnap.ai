"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ShareEventView from "./ShareEventView";

// /share?slug=<shareId> — same public event page as /share/<shareId>, for the
// static GitHub Pages build where path ids can't be pre-rendered.
function ShareFromQuery() {
  const shareId = useSearchParams().get("slug") || "";
  return <ShareEventView key={shareId} shareId={shareId} />;
}

export default function ShareEventQueryPage() {
  return (
    <Suspense fallback={null}>
      <ShareFromQuery />
    </Suspense>
  );
}
