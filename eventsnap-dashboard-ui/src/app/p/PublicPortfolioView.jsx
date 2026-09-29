"use client";

import React, { useState, useEffect } from "react";
import { getPublicPortfolio } from "@/api/portfolioApi";
import {
  PortfolioDataStaticProvider,
} from "@/app/portfolio/portfolioStore";
import { PublicPortfolio } from "@/app/portfolio/PortfolioPreview";

// The public portfolio picks its layout from the isMobile prop (not CSS).
// Same split as the dashboard Preview: phone and tablet widths get the
// compact layout, desktop (1024px+) keeps the full one.
const COMPACT_QUERY = "(max-width: 1023.98px)";
const isCompactViewport = () =>
  typeof window !== "undefined" && window.matchMedia(COMPACT_QUERY).matches;

function useCompactViewport() {
  // Read on first client render — the portfolio itself only renders after
  // its fetch, so the server-rendered "Loading…" never depends on this.
  const [compact, setCompact] = useState(isCompactViewport);
  useEffect(() => {
    const mq = window.matchMedia(COMPACT_QUERY);
    const onChange = (e) => setCompact(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return compact;
}

// Public shareable portfolio — eventsnap.ai/p/<slug> (or /p?slug=<slug> on the
// static GitHub Pages build; see p/page.jsx). Loads the photographer's
// saved Portfolio from the backend by slug (no auth) and renders the same
// public portfolio component the in-app Preview uses.
export default function PublicPortfolioView({ slug }) {
  const [portfolio, setPortfolio] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const compact = useCompactViewport();

  useEffect(() => {
    let active = true;
    getPublicPortfolio(slug)
      .then((res) => {
        if (!active) return;
        setPortfolio(res.data?.portfolio ?? null);
        setStatus(res.data?.portfolio ? "ready" : "error");
      })
      .catch(() => active && setStatus("error"));
    return () => {
      active = false;
    };
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">
        Loading portfolio…
      </div>
    );
  }

  if (status === "error" || !portfolio) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
        <p className="text-gray-700 font-semibold">Portfolio not found</p>
        <p className="text-gray-400 text-sm mt-1">
          This portfolio link is invalid or the portfolio was removed.
        </p>
      </div>
    );
  }

  return (
    <PortfolioDataStaticProvider value={portfolio}>
      <PublicPortfolio isMobile={compact} />
    </PortfolioDataStaticProvider>
  );
}
