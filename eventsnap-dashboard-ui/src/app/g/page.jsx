"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import SharedGalleryView from "./SharedGalleryView";

// /g?slug=<slug> — same shared client gallery as /g/<slug>, for the static
// GitHub Pages build where path slugs can't be pre-rendered.
function GalleryFromQuery() {
  const slug = useSearchParams().get("slug") || "";
  return <SharedGalleryView key={slug} slug={slug} />;
}

export default function PublicGalleryQueryPage() {
  return (
    <Suspense fallback={null}>
      <GalleryFromQuery />
    </Suspense>
  );
}
