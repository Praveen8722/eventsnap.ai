"use client";

import React, { use, useState, useEffect } from "react";
import { getPublicPortfolio } from "@/api/portfolioApi";
import {
  PortfolioDataStaticProvider,
} from "@/app/portfolio/portfolioStore";
import { PublicPortfolio } from "@/app/portfolio/PortfolioPreview";

// Public shareable portfolio — eventsnap.ai/p/<slug>. Loads the photographer's
// saved Portfolio from the backend by slug (no auth) and renders the same
// public portfolio component the in-app Preview uses.
export default function PublicPortfolioPage({ params }) {
  const { slug } = use(params);
  const [portfolio, setPortfolio] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ready | error

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
      <PublicPortfolio isMobile={false} />
    </PortfolioDataStaticProvider>
  );
}
