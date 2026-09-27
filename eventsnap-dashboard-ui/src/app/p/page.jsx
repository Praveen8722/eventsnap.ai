"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PublicPortfolioView from "./PublicPortfolioView";

// /p?slug=<slug> — same public portfolio as /p/<slug>, for the static
// GitHub Pages build where path slugs can't be pre-rendered.
function PortfolioFromQuery() {
  const slug = useSearchParams().get("slug") || "";
  return <PublicPortfolioView key={slug} slug={slug} />;
}

export default function PublicPortfolioQueryPage() {
  return (
    <Suspense fallback={null}>
      <PortfolioFromQuery />
    </Suspense>
  );
}
