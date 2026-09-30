"use client";

// Single source of truth for portfolio data.
// The provider loads the logged-in photographer's Portfolio from MongoDB on
// mount, and every Portfolio page (Overview, Edit, Preview, Gallery, Services,
// Pricing, Testimonials, FAQ, Contact, Link, QR, Settings) reads/writes this
// one object. Saving persists to the backend.

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { DEFAULT_PORTFOLIO } from "./portfolioData";
import { getMyPortfolio, updateMyPortfolio } from "@/api/portfolioApi";
import { publicPortfolioUrl } from "@/lib/portfolioQr";

const PortfolioDataContext = createContext(null);

// The DEFAULT_PORTFOLIO only supplies the SHAPE (all keys/arrays present).
// Identifying/demo values are cleared so a fresh photographer never sees them.
const DEFAULT_SETTINGS = {
  published: true,
  allowInquiries: true,
  passwordProtected: false,
  showPricing: true,
  showTestimonials: true,
  showFAQ: true,
  analytics: true,
  seoOptimized: true,
};

const BLANK_SHAPE = {
  ...DEFAULT_PORTFOLIO,
  name: "",
  slug: "",
  tagline: "",
  bio: "",
  about: "",
  location: "",
  serviceArea: "",
  phone: "",
  email: "",
  experience: "",
  profilePhoto: "",
  coverImage: "",
  navbarPhoto: "",
  // Pinned public URL the QR code encodes — generated once, then permanent
  // (see the one-time pin effect and regenerateQr below).
  qrUrl: "",
  social: { instagram: "", facebook: "", youtube: "", whatsapp: "" },
  services: [],
  gallery: [],
  pricing: [],
  testimonials: [],
  faqs: [],
  settings: { ...DEFAULT_SETTINGS },
};

// Merge a server document onto the blank shape so every field/array exists.
const withShape = (doc = {}) => ({
  ...BLANK_SHAPE,
  ...doc,
  social: { ...BLANK_SHAPE.social, ...(doc.social || {}) },
  settings: { ...DEFAULT_SETTINGS, ...(doc.settings || {}) },
  services: doc.services || [],
  gallery: doc.gallery || [],
  pricing: doc.pricing || [],
  testimonials: doc.testimonials || [],
  faqs: doc.faqs || [],
});

function PortfolioLoading() {
  return (
    <div className="flex items-center justify-center py-24 text-sm text-gray-400">
      Loading your portfolio…
    </div>
  );
}

function PortfolioLoadError({ onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <p className="text-sm text-gray-600">Couldn’t load your portfolio.</p>
      <button
        onClick={onRetry}
        className="text-sm text-[#6C63FF] border border-[#6C63FF] rounded-lg px-4 py-2 hover:bg-[#EEF0FF]"
      >
        Retry
      </button>
    </div>
  );
}

export function PortfolioDataProvider({ children }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const dataRef = useRef(null);
  dataRef.current = data;
  const pendingRef = useRef(null);
  const saveTimer = useRef(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return getMyPortfolio()
      .then((res) => {
        setData(withShape(res.data?.portfolio));
      })
      .catch((e) => {
        setError(e);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Persist to the backend. Accepts an explicit object, else saves current data.
  const save = useCallback(async (next) => {
    const payload = next ?? pendingRef.current ?? dataRef.current;
    if (!payload) return { ok: false };
    setSaving(true);
    setSaveError(null);
    try {
      const res = await updateMyPortfolio(payload);
      const fresh = withShape(res.data?.portfolio);
      setData(fresh);
      pendingRef.current = null;
      return { ok: true, portfolio: fresh };
    } catch (e) {
      setSaveError(e);
      return { ok: false, error: e };
    } finally {
      setSaving(false);
    }
  }, []);

  // The QR code's URL is pinned once and kept permanently. It is generated
  // the first time the portfolio loads without one, and from then on it never
  // follows later slug edits — so a QR the photographer has already printed or
  // shared keeps pointing at the same URL. Editing portfolio content never
  // regenerates it; only an explicit regenerateQr() does.
  const qrPinnedRef = useRef(false);
  useEffect(() => {
    if (qrPinnedRef.current || !data) return;
    if (data.qrUrl) {
      qrPinnedRef.current = true;
      return;
    }
    const url = publicPortfolioUrl(data.slug);
    if (!url) return; // no slug / window not ready yet — try again next render
    qrPinnedRef.current = true;
    save({ ...data, qrUrl: url });
  }, [data, save]);

  // Explicit "Regenerate QR" — re-pins the QR to the current public URL. This
  // is the only way the QR changes once created (e.g. to adopt a new slug).
  const regenerateQr = useCallback(() => {
    const url = publicPortfolioUrl(dataRef.current?.slug);
    if (!url) return Promise.resolve({ ok: false });
    return save({ ...dataRef.current, qrUrl: url });
  }, [save]);

  // Update the shared object now (so every page reflects it immediately) and
  // persist shortly after — used by the always-editing section pages.
  const scheduleSave = useCallback(
    (next, delay = 1200) => {
      if (typeof next === "function") {
        setData((prev) => {
          const computed = next(prev);
          pendingRef.current = computed;
          return computed;
        });
      } else if (next) {
        setData(next);
        pendingRef.current = next;
      }
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => save(), delay);
    },
    [save]
  );

  const value = {
    data,
    setData,
    save,
    scheduleSave,
    regenerateQr,
    reload: load,
    loading,
    error,
    saving,
    saveError,
  };

  return (
    <PortfolioDataContext.Provider value={value}>
      {loading || !data ? (
        error ? <PortfolioLoadError onRetry={load} /> : <PortfolioLoading />
      ) : (
        children
      )}
    </PortfolioDataContext.Provider>
  );
}

// Static provider for public pages that already have the data (by slug).
export function PortfolioDataStaticProvider({ value, children }) {
  const ctx = {
    data: withShape(value),
    setData: () => {},
    save: async () => ({ ok: false }),
    scheduleSave: () => {},
    regenerateQr: async () => ({ ok: false }),
    reload: () => {},
    loading: false,
    error: null,
    saving: false,
    saveError: null,
  };
  return (
    <PortfolioDataContext.Provider value={ctx}>
      {children}
    </PortfolioDataContext.Provider>
  );
}

// Read-only access to the live portfolio data.
export function usePortfolioData() {
  const ctx = useContext(PortfolioDataContext);
  return ctx?.data ?? BLANK_SHAPE;
}

// Read/write + persistence access — used by the editor pages.
export function usePortfolioDataStore() {
  const ctx = useContext(PortfolioDataContext);
  if (!ctx) {
    throw new Error(
      "usePortfolioDataStore must be used within a <PortfolioDataProvider>"
    );
  }
  return ctx;
}
