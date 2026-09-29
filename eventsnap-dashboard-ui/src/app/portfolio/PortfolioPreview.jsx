"use client";

import { useState, useRef, useEffect, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import {
  Monitor,
  Tablet,
  Smartphone,
  ExternalLink,
  RefreshCw,
  Menu,
  X,
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  Youtube,
  Star,
  ChevronDown,
  ChevronUp,
  Send,
  CheckCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Poppins } from "next/font/google";
import { usePortfolioData } from "./portfolioStore";
import { photoSrc } from "./portfolioPhoto";
import { publicPortfolioUrl, displayUrl } from "@/lib/portfolioQr";
import { viewBookings } from "@/api/bookingApi";
import { portfolioAssetUrl } from "@/api/portfolioApi";
import { submitInquiry } from "@/api/inquiryApi";
import { whatsAppLink } from "@/lib/whatsapp";
import { isValidPhoneNumber } from "@/lib/phone";
import { FaWhatsapp } from "react-icons/fa";

// Shared booking modal — loaded on demand, same as the Bookings/Dashboard pages.
const Model = dynamic(() => import("@/components/ui/Model"));

const DEVICE_CONFIG = {
  desktop: { width: 1200, scale: 0.72, label: "Desktop", icon: Monitor },
  tablet: { width: 768, scale: 0.8, label: "Tablet", icon: Tablet },
  mobile: { width: 390, scale: 0.85, label: "Mobile", icon: Smartphone },
};

// ─── Live theming (Portfolio Settings → Theme + Accent Color) ──────────────────
// Every public-portfolio component reads its colors from a token object built
// from p.theme ("dark" | "light" | "minimal") and p.accent. Layout, spacing,
// typography and content are untouched — only color values resolve through here.

const hexToRgb = (h) => {
  const s = String(h).replace("#", "");
  const n = s.length === 3 ? s.split("").map((c) => c + c).join("") : s;
  const int = parseInt(n, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
};
const rgba = (h, a) => {
  const { r, g, b } = hexToRgb(h);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
const mix = (h1, h2, w) => {
  const a = hexToRgb(h1);
  const b = hexToRgb(h2);
  const ch = (x, y) => Math.round(x + (y - x) * w);
  const hx = (v) => v.toString(16).padStart(2, "0");
  return `#${hx(ch(a.r, b.r))}${hx(ch(a.g, b.g))}${hx(ch(a.b, b.b))}`;
};

function buildTheme(themeName, accentHex) {
  const name = ["dark", "light", "minimal"].includes(themeName)
    ? themeName
    : "dark";
  const acc = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(accentHex || "")
    ? accentHex
    : "#6C63FF";
  const isDefault = acc.toLowerCase() === "#6c63ff";
  const A = (a) => rgba(acc, a);

  const accLite =
    name === "minimal" ? acc : isDefault ? "#A89CFF" : mix(acc, "#FFFFFF", 0.34);
  const accSoftLight = isDefault ? "#EEF0FF" : mix(acc, "#FFFFFF", 0.9);
  const accGrad =
    name === "minimal"
      ? acc
      : isDefault
        ? "linear-gradient(135deg,#6C63FF,#8B82FF)"
        : `linear-gradient(135deg, ${acc}, ${mix(acc, "#FFFFFF", 0.22)})`;
  const accGradWarm =
    name === "minimal"
      ? acc
      : isDefault
        ? "linear-gradient(135deg,#6C63FF,#FF675D)"
        : `linear-gradient(135deg, ${acc}, ${mix(acc, "#FF6F61", 0.5)})`;

  const common = {
    name,
    acc,
    accLite,
    accGrad,
    accGradWarm,
    accRing: A(0.1),
    accOn: "#FFFFFF",
    star: "#F59E0B",
    starBadge: "#FEF3C7",
    success: "#10B981",
  };

  if (name === "light") {
    return {
      ...common,
      wrap: "#1E1E1E",
      pageBg: "#FFFFFF",
      accText: isDefault ? "#6C63FF" : mix(acc, "#000000", 0.08),
      accSoft: accSoftLight,
      accTint: A(0.12),
      sBg: "#FFFFFF",
      sBgAlt: "#F5F7FA",
      sHead: "#111318",
      sText: "#4B5563",
      sTextSoft: "#6B7280",
      sSubtle: "#9CA3AF",
      sCard: "#FFFFFF",
      sCardAlt: "#F5F7FA",
      sBorder: "#E5E7EB",
      sDivider: "#F1F2F4",
      sChipBg: accSoftLight,
      sChipText: isDefault ? "#6C63FF" : mix(acc, "#000000", 0.08),
      pBg: "#EEF1F5",
      pNavBg: "rgba(238, 241, 245, 0.9)",
      pBorder: "rgba(17, 19, 24, 0.1)",
      pHairline: "rgba(17, 19, 24, 0.14)",
      pText: "#111318",
      pTextMuted: "rgba(17, 19, 24, 0.62)",
      pTextMuted2: "rgba(17, 19, 24, 0.55)",
      pTextFaint: "rgba(17, 19, 24, 0.45)",
      pTextFaint2: "rgba(17, 19, 24, 0.38)",
      pNavLink: "rgba(17, 19, 24, 0.62)",
      pNavLinkM: "rgba(17, 19, 24, 0.75)",
      pNavBorderM: "rgba(17, 19, 24, 0.08)",
      pInset: "rgba(17, 19, 24, 0.04)",
      pInsetBorder: "rgba(17, 19, 24, 0.1)",
      pSoftIconBg: "rgba(17, 19, 24, 0.06)",
      pSoftIconText: "rgba(17, 19, 24, 0.55)",
      pChipBg: A(0.12),
      pChipText: isDefault ? "#6C63FF" : mix(acc, "#000000", 0.05),
      hOverlay:
        "linear-gradient(to right, rgba(255,255,255,0.94) 45%, rgba(255,255,255,0.55))",
      hText: "#111318",
      hTextAcc: isDefault ? "#6C63FF" : mix(acc, "#000000", 0.08),
      hTextMuted: "rgba(17, 19, 24, 0.6)",
      hChipBg: A(0.12),
      hChipBorder: A(0.3),
      hDot: acc,
      hSecBg: "rgba(17, 19, 24, 0.05)",
      hSecBorder: "rgba(17, 19, 24, 0.14)",
      hSecText: "#111318",
      fBg: "#14161F",
      fBorder: acc,
      fRing: A(0.1),
      fName: accLite,
      fPrice: "#FFFFFF",
      fDesc: "rgba(255, 255, 255, 0.55)",
      fRow: "rgba(255, 255, 255, 0.82)",
      fRowBorder: "rgba(255, 255, 255, 0.1)",
      fBtnBg: accGrad,
      fBtnText: "#FFFFFF",
      nCardBg: "#FFFFFF",
      nCardBorder: "#E5E7EB",
      nName: "#9CA3AF",
      nPrice: "#1E1E1E",
      nDesc: "#9CA3AF",
      nRow: "#4B5563",
      nRowBorder: "#F3F4F6",
      nBtnBorder: acc,
      nBtnText: isDefault ? "#6C63FF" : acc,
      inBg: "#FFFFFF",
      inBorder: "#E5E7EB",
      inText: "#1E1E1E",
      inPlaceholder: "#9CA3AF",
    };
  }

  if (name === "minimal") {
    return {
      ...common,
      wrap: "#1A1A1A",
      pageBg: "#FFFFFF",
      accText: acc,
      accSoft: "#F4F4F5",
      accTint: A(0.08),
      sBg: "#FFFFFF",
      sBgAlt: "#FCFCFC",
      sHead: "#1A1A1A",
      sText: "#5B5B5B",
      sTextSoft: "#6B6B6B",
      sSubtle: "#A0A0A0",
      sCard: "#FFFFFF",
      sCardAlt: "#FCFCFC",
      sBorder: "#ECECEC",
      sDivider: "#F2F2F2",
      sChipBg: "#F4F4F5",
      sChipText: "#6B7280",
      pBg: "#FFFFFF",
      pNavBg: "rgba(255, 255, 255, 0.9)",
      pBorder: "#ECECEC",
      pHairline: "#E4E4E4",
      pText: "#1A1A1A",
      pTextMuted: "#6B7280",
      pTextMuted2: "#6B7280",
      pTextFaint: "#9CA3AF",
      pTextFaint2: "#B0B4BB",
      pNavLink: "#6B7280",
      pNavLinkM: "#4B5563",
      pNavBorderM: "#F0F0F0",
      pInset: "#FFFFFF",
      pInsetBorder: "#ECECEC",
      pSoftIconBg: "#F4F4F5",
      pSoftIconText: "#6B7280",
      pChipBg: "#F4F4F5",
      pChipText: "#6B7280",
      hOverlay:
        "linear-gradient(to right, rgba(255,255,255,0.96) 50%, rgba(255,255,255,0.72))",
      hText: "#1A1A1A",
      hTextAcc: acc,
      hTextMuted: "#6B7280",
      hChipBg: "#F4F4F5",
      hChipBorder: "#ECECEC",
      hDot: acc,
      hSecBg: "#FFFFFF",
      hSecBorder: "#DADADA",
      hSecText: "#1A1A1A",
      fBg: mix(acc, "#FFFFFF", 0.92),
      fBorder: acc,
      fRing: "transparent",
      fName: acc,
      fPrice: "#1A1A1A",
      fDesc: "#6B7280",
      fRow: "#5B5B5B",
      fRowBorder: "#EFEFEF",
      fBtnBg: acc,
      fBtnText: "#FFFFFF",
      nCardBg: "#FFFFFF",
      nCardBorder: "#ECECEC",
      nName: "#A0A0A0",
      nPrice: "#1A1A1A",
      nDesc: "#A0A0A0",
      nRow: "#5B5B5B",
      nRowBorder: "#F2F2F2",
      nBtnBorder: acc,
      nBtnText: acc,
      inBg: "#FFFFFF",
      inBorder: "#ECECEC",
      inText: "#1A1A1A",
      inPlaceholder: "#A0A0A0",
    };
  }

  // "dark" — the existing look (exact literals); only the accent is swappable.
  return {
    ...common,
    wrap: "#1E1E1E",
    pageBg: "#FFFFFF",
    accText: isDefault ? "#6C63FF" : acc,
    accSoft: accSoftLight,
    accTint: A(0.15),
    sBg: "#FFFFFF",
    sBgAlt: "#FAFAFA",
    sHead: "#1E1E1E",
    sText: "#4B5563",
    sTextSoft: "#6B7280",
    sSubtle: "#9CA3AF",
    sCard: "#FFFFFF",
    sCardAlt: "#FAFAFA",
    sBorder: "#E5E7EB",
    sDivider: "#F3F4F6",
    sChipBg: accSoftLight,
    sChipText: isDefault ? "#6C63FF" : acc,
    pBg: "#0D0B1E",
    pNavBg: "rgba(13, 11, 30, 0.92)",
    pBorder: "rgba(255, 255, 255, 0.08)",
    pHairline: "rgba(255, 255, 255, 0.15)",
    pText: "#FFFFFF",
    pTextMuted: "rgba(255, 255, 255, 0.6)",
    pTextMuted2: "rgba(255, 255, 255, 0.5)",
    pTextFaint: "rgba(255, 255, 255, 0.4)",
    pTextFaint2: "rgba(255, 255, 255, 0.3)",
    pNavLink: "rgba(255, 255, 255, 0.7)",
    pNavLinkM: "rgba(255, 255, 255, 0.8)",
    pNavBorderM: "rgba(255, 255, 255, 0.06)",
    pInset: "rgba(255, 255, 255, 0.04)",
    pInsetBorder: "rgba(255, 255, 255, 0.08)",
    pSoftIconBg: "rgba(255, 255, 255, 0.08)",
    pSoftIconText: "rgba(255, 255, 255, 0.6)",
    pChipBg: A(0.15),
    pChipText: accLite,
    hOverlay:
      "linear-gradient(to right, rgba(13,11,30,0.90) 50%, rgba(13,11,30,0.4))",
    hText: "#FFFFFF",
    hTextAcc: accLite,
    hTextMuted: "rgba(255, 255, 255, 0.6)",
    hChipBg: A(0.2),
    hChipBorder: A(0.4),
    hDot: acc,
    hSecBg: "rgba(255, 255, 255, 0.1)",
    hSecBorder: "rgba(255, 255, 255, 0.2)",
    hSecText: "#FFFFFF",
    fBg: "#0D0B1E",
    fBorder: acc,
    fRing: A(0.1),
    fName: accLite,
    fPrice: "#FFFFFF",
    fDesc: "rgba(255, 255, 255, 0.5)",
    fRow: "rgba(255, 255, 255, 0.8)",
    fRowBorder: "rgba(255, 255, 255, 0.08)",
    fBtnBg: accGrad,
    fBtnText: "#FFFFFF",
    nCardBg: "#FFFFFF",
    nCardBorder: "#E5E7EB",
    nName: "#9CA3AF",
    nPrice: "#1E1E1E",
    nDesc: "#9CA3AF",
    nRow: "#4B5563",
    nRowBorder: "#F3F4F6",
    nBtnBorder: acc,
    nBtnText: isDefault ? "#6C63FF" : acc,
    inBg: "#FFFFFF",
    inBorder: "#E5E7EB",
    inText: "#1E1E1E",
    inPlaceholder: "#9CA3AF",
  };
}

const ThemeCtx = createContext(null);
const useT = () => useContext(ThemeCtx) || buildTheme("dark", "#6C63FF");

// ─── Public Portfolio ──────────────────────────────────────────────────────────

// Up to two initials of the portfolio's own name ("Lalitha Photoshop" -> "LP").
const initialsOf = (text) =>
  String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

function PublicNav({ isMobile }) {
  const p = usePortfolioData();
  const t = useT();
  const [open, setOpen] = useState(false);
  // "Book Now" opens the shared New Booking modal (existing fields + booking API).
  const [bookingOpen, setBookingOpen] = useState(false);
  const refreshBookings = () => viewBookings().catch(() => {});
  const navRef = useRef(null);
  const links = [
    "About",
    "Services",
    "Portfolio",
    "Pricing",
    "Testimonials",
    "FAQ",
    "Contact",
  ];

  const SECTION_IDS = {
    Home: "hero",
    About: "about",
    Services: "services",
    Portfolio: "gallery",
    Pricing: "pricing",
    Testimonials: "testimonials",
    FAQ: "faq",
    Contact: "contact",
  };

  const scrollToSection = (id) => {
    if (!id) return;
    const nav = navRef.current;
    const root = nav?.parentElement;
    const target = root?.querySelector(`#${id}`);
    if (!target) return;
    const scroller = nav?.closest(".overflow-y-auto");
    const navHeight = nav?.offsetHeight ?? 0;
    if (scroller) {
      const top =
        target.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop -
        navHeight;
      scroller.scrollTo({ top, behavior: "smooth" });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleNavClick = (e, label) => {
    e.preventDefault();
    scrollToSection(SECTION_IDS[label]);
    setOpen(false);
  };

  const handleBookNow = (e) => {
    e.preventDefault();
    setOpen(false);
    setBookingOpen(true);
  };

  return (
    <nav
      ref={navRef}
      style={{
        background: t.pNavBg,
        backdropFilter: "blur(12px)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: `1px solid ${t.pBorder}`,
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          padding: isMobile ? "0 16px" : "0 40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 64,
        }}
      >
        <div
          onClick={(e) => handleNavClick(e, "Home")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          {/* The navbar's own photo (Edit Portfolio → Navbar Photo, separate
              from the About profile photo), else the owner's initials. */}
          {p.navbarPhoto ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoSrc(p.navbarPhoto, "w=72&h=72&fit=crop&auto=format")}
              alt=""
              style={{ width: 36, height: 36, borderRadius: 10, objectFit: "cover", flexShrink: 0 }}
            />
          ) : (
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: t.accGradWarm,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 14 }}>
                {initialsOf(p.name)}
              </span>
            </div>
          )}
          <span style={{ color: t.pText, fontWeight: 700, fontSize: 16 }}>
            {p.name}
          </span>
        </div>
        {!isMobile ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {links.map((l) => (
              <a
                key={l}
                href={`#${SECTION_IDS[l]}`}
                onClick={(e) => handleNavClick(e, l)}
                style={{
                  color: t.pNavLink,
                  fontSize: 13,
                  padding: "6px 10px",
                  borderRadius: 6,
                  textDecoration: "none",
                }}
              >
                {l}
              </a>
            ))}
            <a
              href="#contact"
              onClick={handleBookNow}
              style={{
                background: t.acc,
                color: t.accOn,
                fontSize: 13,
                padding: "8px 18px",
                borderRadius: 8,
                fontWeight: 600,
                textDecoration: "none",
                marginLeft: 8,
              }}
            >
              Book Now
            </a>
          </div>
        ) : (
          <button
            onClick={() => setOpen((o) => !o)}
            style={{
              color: t.pText,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
            }}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        )}
      </div>
      {isMobile && open && (
        <div
          style={{
            background: t.pBg,
            borderTop: `1px solid ${t.pBorder}`,
            padding: "12px 16px 20px",
          }}
        >
          {links.map((l) => (
            <a
              key={l}
              href={`#${SECTION_IDS[l]}`}
              onClick={(e) => handleNavClick(e, l)}
              style={{
                display: "block",
                color: t.pNavLinkM,
                fontSize: 15,
                padding: "10px 0",
                borderBottom: `1px solid ${t.pNavBorderM}`,
                textDecoration: "none",
              }}
            >
              {l}
            </a>
          ))}
          <a
            href="#contact"
            onClick={handleBookNow}
            style={{
              display: "block",
              marginTop: 16,
              background: t.acc,
              color: t.accOn,
              textAlign: "center",
              padding: "12px",
              borderRadius: 10,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Book Now
          </a>
        </div>
      )}

      {/* Portaled to <body>: the nav's backdropFilter makes it the containing
          block for position:fixed descendants, which would clip the modal's
          fullscreen overlay to the navbar strip. */}
      {bookingOpen &&
        createPortal(
          <Model
            type="newBooking"
            bookingSource="portfolio"
            portfolioSlug={p.slug}
            onClose={() => setBookingOpen(false)}
            onCreated={refreshBookings}
          />,
          document.body
        )}
    </nav>
  );
}

function PublicHero({ isMobile }) {
  const p = usePortfolioData();
  const t = useT();
  return (
    <section
      id="hero"
      style={{
        position: "relative",
        minHeight: isMobile ? 480 : 640,
        display: "flex",
        alignItems: "center",
      }}
    >
      <img
        src={photoSrc(p.coverImage, "w=1400&h=800&fit=crop&auto=format")}
        alt="Cover"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center top",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: t.hOverlay,
        }}
      />
      <div
        style={{
          position: "relative",
          maxWidth: 1100,
          margin: "0 auto",
          padding: isMobile ? "60px 20px" : "0 40px",
          width: "100%",
        }}
      >
        <div style={{ maxWidth: isMobile ? "100%" : 560 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: t.hChipBg,
              border: `1px solid ${t.hChipBorder}`,
              borderRadius: 100,
              padding: "4px 12px",
              marginBottom: 16,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: t.hDot,
              }}
            />
            <span style={{ color: t.hTextAcc, fontSize: 12, fontWeight: 600 }}>
              Available for bookings
            </span>
          </div>
          <h1
            style={{
              color: t.hText,
              fontSize: isMobile ? 32 : 52,
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: 16,
            }}
          >
            {p.name}
          </h1>
          <p
            style={{
              color: t.hTextAcc,
              fontSize: isMobile ? 16 : 20,
              fontWeight: 500,
              marginBottom: 12,
            }}
          >
            {p.tagline}
          </p>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              color: t.hTextMuted,
              fontSize: 14,
              marginBottom: 32,
            }}
          >
            <MapPin size={14} />
            <span>{p.location}</span>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <a
              href="#gallery"
              style={{
                background: t.acc,
                color: t.accOn,
                padding: isMobile ? "12px 20px" : "14px 28px",
                borderRadius: 10,
                fontWeight: 600,
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              View Portfolio
            </a>
            <a
              href="#contact"
              style={{
                background: t.hSecBg,
                border: `1px solid ${t.hSecBorder}`,
                color: t.hSecText,
                padding: isMobile ? "12px 20px" : "14px 28px",
                borderRadius: 10,
                fontWeight: 600,
                textDecoration: "none",
                fontSize: 14,
              }}
            >
              Contact Me
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function PublicAbout({ isMobile }) {
  const p = usePortfolioData();
  const t = useT();
  return (
    <section
      id="about"
      style={{
        padding: isMobile ? "60px 20px" : "80px 40px",
        background: t.sBgAlt,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 60,
            alignItems: "center",
          }}
        >
          <div style={{ order: isMobile ? 2 : 1 }}>
            <div
              style={{
                display: "inline-block",
                background: t.sChipBg,
                color: t.sChipText,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "4px 12px",
                borderRadius: 100,
                marginBottom: 16,
              }}
            >
              About Me
            </div>
            <h2
              style={{
                fontSize: isMobile ? 28 : 36,
                fontWeight: 800,
                color: t.sHead,
                marginBottom: 20,
                lineHeight: 1.2,
              }}
            >
              Telling Stories Through Light & Lens
            </h2>
            <p
              style={{
                color: t.sText,
                fontSize: 16,
                lineHeight: 1.7,
                marginBottom: 24,
              }}
            >
              {p.about}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              {[
                ["Experience", p.experience],
                ["Location", p.location.split(",")[0]],
                ["Speciality", "Weddings & Portraits"],
                ["Availability", "Worldwide"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  style={{
                    padding: "16px",
                    background: t.sCard,
                    borderRadius: 12,
                    border: `1px solid ${t.sBorder}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: t.sSubtle,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 4,
                    }}
                  >
                    {k}
                  </div>
                  <div
                    style={{ fontSize: 15, fontWeight: 700, color: t.sHead }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ order: isMobile ? 1 : 2 }}>
            <div
              style={{
                position: "relative",
                display: "inline-block",
                width: "100%",
              }}
            >
              <img
                src={photoSrc(p.profilePhoto, "w=600&h=750&fit=crop&auto=format")}
                alt={p.name}
                style={{
                  display: "block",
                  width: "100%",
                  borderRadius: 20,
                  objectFit: "cover",
                  objectPosition: "center",
                  background: t.sCardAlt,
                  aspectRatio: "4/5",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: -20,
                  background: t.sCard,
                  borderRadius: 14,
                  padding: "14px 18px",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    background: t.starBadge,
                    borderRadius: "50%",
                    width: 36,
                    height: 36,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Star size={18} fill={t.star} color={t.star} />
                </div>
                <div>
                  <div
                    style={{ fontWeight: 700, fontSize: 16, color: t.sHead }}
                  >
                    4.9/5.0
                  </div>
                  <div style={{ fontSize: 11, color: t.sSubtle }}>
                    200+ reviews
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PublicServices({ isMobile }) {
  const p = usePortfolioData();
  const t = useT();
  return (
    <section
      id="services"
      style={{
        padding: isMobile ? "60px 20px" : "80px 40px",
        background: t.sBg,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <style>{`
          .ps-services-grid .ps-card {
            background-color: var(--pv-card-bg);
            border: 1px solid var(--pv-card-border);
            transition: transform .4s cubic-bezier(.22,1,.36,1),
                        box-shadow .4s cubic-bezier(.22,1,.36,1),
                        border-color .4s ease,
                        background-color .4s ease;
            will-change: transform;
          }
          .ps-services-grid .ps-card__icon {
            transition: transform .4s cubic-bezier(.22,1,.36,1), box-shadow .4s ease;
          }
          .ps-services-grid .ps-card__icon span {
            display: inline-block;
            transition: transform .4s cubic-bezier(.22,1,.36,1);
          }
          @media (hover: hover) {
            .ps-services-grid .ps-card:hover {
              transform: translateY(-8px) scale(1.02);
              background-color: var(--pv-card-bg-hover);
              border-color: var(--pv-glow-border);
              box-shadow: 0 22px 45px -16px var(--pv-glow-1),
                          0 10px 24px -12px rgba(17,17,26,0.14);
            }
            .ps-services-grid .ps-card:hover .ps-card__icon {
              transform: scale(1.12) rotate(-3deg);
              box-shadow: 0 10px 22px -8px var(--pv-icon-glow);
            }
            .ps-services-grid .ps-card:hover .ps-card__icon span {
              transform: scale(1.18);
            }
          }
          @media (prefers-reduced-motion: reduce) {
            .ps-services-grid .ps-card,
            .ps-services-grid .ps-card__icon,
            .ps-services-grid .ps-card__icon span {
              transition: none;
            }
            .ps-services-grid .ps-card:hover {
              transform: none;
              box-shadow: 0 12px 26px -14px var(--pv-glow-reduced);
            }
            .ps-services-grid .ps-card:hover .ps-card__icon,
            .ps-services-grid .ps-card:hover .ps-card__icon span {
              transform: none;
            }
          }
        `}</style>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              display: "inline-block",
              background: t.sChipBg,
              color: t.sChipText,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "4px 12px",
              borderRadius: 100,
              marginBottom: 16,
            }}
          >
            Services
          </div>
          <h2
            style={{
              fontSize: isMobile ? 28 : 36,
              fontWeight: 800,
              color: t.sHead,
            }}
          >
            What I Offer
          </h2>
        </div>
        <div
          className="ps-services-grid"
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 20,
            "--pv-card-bg": t.sCardAlt,
            "--pv-card-border": t.sBorder,
            "--pv-card-bg-hover": t.sCard,
            "--pv-glow-border": rgba(t.acc, 0.45),
            "--pv-glow-1": rgba(t.acc, 0.38),
            "--pv-icon-glow": rgba(t.acc, 0.5),
            "--pv-glow-reduced": rgba(t.acc, 0.3),
          }}
        >
          {p.services.map((svc) => (
            <div
              key={svc.id}
              className="ps-card"
              style={{
                padding: 24,
                borderRadius: 16,
              }}
            >
              <div
                className="ps-card__icon"
                style={{
                  width: 44,
                  height: 44,
                  background: t.accSoft,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <span style={{ fontSize: 20 }}>📷</span>
              </div>
              <h3
                style={{
                  fontWeight: 700,
                  fontSize: 16,
                  color: t.sHead,
                  marginBottom: 8,
                }}
              >
                {svc.title}
              </h3>
              <p
                style={{
                  color: t.sTextSoft,
                  fontSize: 13,
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}
              >
                {svc.description}
              </p>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ fontSize: 12, color: t.sSubtle }}>
                  {svc.duration}
                </span>
                <span
                  style={{ fontWeight: 700, color: t.accText, fontSize: 14 }}
                >
                  {svc.price}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const CATS = ["All", "Wedding", "Portrait", "Corporate", "Events"];

// Gallery photos come from three possible sources: uploaded through this app
// (stored on the server, url like "/uploads/portfolio/x.jpg"), a legacy
// base64 upload from before photos were moved server-side (isLocal, url is
// already a ready-to-use data URL), or seeded starter content (just an
// Unsplash id that needs the host prefix). Returns undefined when there is no
// image (e.g. a portfolio with an empty gallery) so <img> renders no src
// attribute instead of an empty one.
const galleryImageSrc = (img, params) => {
  if (!img || !img.url) return undefined;
  if (img.isLocal) return img.url;
  if (img.url.startsWith("/uploads/")) return portfolioAssetUrl(img.url);
  return `https://images.unsplash.com/${img.url}?${params}`;
};

function PublicGallery({ isMobile }) {
  const p = usePortfolioData();
  const t = useT();
  const [cat, setCat] = useState("All");
  const filtered =
    cat === "All" ? p.gallery : p.gallery.filter((g) => g.category === cat);

  return (
    <section
      id="gallery"
      style={{
        padding: isMobile ? "60px 20px" : "80px 40px",
        background: t.pBg,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              display: "inline-block",
              background: t.pChipBg,
              color: t.pChipText,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "4px 12px",
              borderRadius: 100,
              marginBottom: 16,
            }}
          >
            Portfolio
          </div>
          <h2
            style={{
              fontSize: isMobile ? 28 : 36,
              fontWeight: 800,
              color: t.pText,
            }}
          >
            Selected Work
          </h2>
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "center",
            flexWrap: "wrap",
            marginBottom: 32,
          }}
        >
          {CATS.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              style={{
                padding: "7px 18px",
                borderRadius: 100,
                border: "1px solid",
                borderColor: cat === c ? t.acc : t.pHairline,
                background: cat === c ? t.acc : "transparent",
                color: cat === c ? t.accOn : t.pTextMuted,
                fontSize: 13,
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <div style={{ columns: isMobile ? 2 : 3, gap: 12 }}>
          {filtered.map((img, i) => (
            <div
              key={img.id}
              style={{
                breakInside: "avoid",
                marginBottom: 12,
                borderRadius: 12,
                overflow: "hidden",
                position: "relative",
                cursor: "pointer",
              }}
            >
              <img
                src={galleryImageSrc(img, `w=400&h=${300 + (i % 3) * 80}&fit=crop&auto=format`)}
                alt={img.caption}
                style={{ width: "100%", display: "block", objectFit: "cover" }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "rgba(0,0,0,0)",
                  transition: "background 0.2s",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: 12,
                }}
              >
                <span
                  style={{
                    color: "white",
                    fontSize: 11,
                    fontWeight: 600,
                    background: "rgba(0,0,0,0.5)",
                    padding: "2px 8px",
                    borderRadius: 100,
                  }}
                >
                  {img.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PublicPricing({ isMobile }) {
  const p = usePortfolioData();
  const t = useT();
  // "Book Now" opens the shared New Booking modal (existing fields + booking API).
  const [bookingOpen, setBookingOpen] = useState(false);
  // No booking list is shown on this page — re-sync from the server after a
  // successful booking so any open Bookings/Payments view is current.
  const refreshBookings = () => viewBookings().catch(() => {});
  return (
    <section
      id="pricing"
      style={{
        padding: isMobile ? "60px 20px" : "80px 40px",
        background: t.sBgAlt,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              display: "inline-block",
              background: t.sChipBg,
              color: t.sChipText,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "4px 12px",
              borderRadius: 100,
              marginBottom: 16,
            }}
          >
            Pricing
          </div>
          <h2
            style={{
              fontSize: isMobile ? 28 : 36,
              fontWeight: 800,
              color: t.sHead,
            }}
          >
            Photography Packages
          </h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 24,
          }}
        >
          {p.pricing.map((pkg) => (
            <div
              key={pkg.id}
              style={{
                background: pkg.popular ? t.fBg : t.nCardBg,
                borderRadius: 20,
                padding: 28,
                border: pkg.popular
                  ? `2px solid ${t.fBorder}`
                  : `1px solid ${t.nCardBorder}`,
                position: "relative",
                boxShadow: pkg.popular ? `0 0 0 4px ${t.fRing}` : "none",
              }}
            >
              {pkg.popular && (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: t.accGradWarm,
                    color: t.accOn,
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 14px",
                    borderRadius: 100,
                  }}
                >
                  Most Popular
                </div>
              )}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: pkg.popular ? t.fName : t.nName,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 8,
                }}
              >
                {pkg.name}
              </div>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 800,
                  color: pkg.popular ? t.fPrice : t.nPrice,
                  marginBottom: 4,
                }}
              >
                {pkg.price}
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: pkg.popular ? t.fDesc : t.nDesc,
                  marginBottom: 24,
                }}
              >
                {pkg.description}
              </p>
              <ul
                style={{
                  listStyle: "none",
                  padding: 0,
                  marginBottom: 28,
                  space: "8px",
                }}
              >
                {pkg.features.map((f, i) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 0",
                      color: pkg.popular ? t.fRow : t.nRow,
                      fontSize: 13,
                      borderBottom: `1px solid ${pkg.popular ? t.fRowBorder : t.nRowBorder}`,
                    }}
                  >
                    <CheckCircle
                      size={14}
                      style={{ color: t.accText, flexShrink: 0 }}
                    />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setBookingOpen(true)}
                style={{
                  width: "100%",
                  padding: "13px",
                  borderRadius: 10,
                  background: pkg.popular ? t.fBtnBg : "transparent",
                  border: pkg.popular ? "none" : `2px solid ${t.nBtnBorder}`,
                  color: pkg.popular ? t.fBtnText : t.nBtnText,
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                Book Now
              </button>
            </div>
          ))}
        </div>
      </div>

      {bookingOpen && (
        <Model
          type="newBooking"
          bookingSource="portfolio"
          portfolioSlug={p.slug}
          onClose={() => setBookingOpen(false)}
          onCreated={refreshBookings}
        />
      )}
    </section>
  );
}

function PublicTestimonials({ isMobile }) {
  const p = usePortfolioData();
  const t = useT();
  return (
    <section
      id="testimonials"
      style={{
        padding: isMobile ? "60px 20px" : "80px 40px",
        background: t.sBg,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              display: "inline-block",
              background: t.sChipBg,
              color: t.sChipText,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "4px 12px",
              borderRadius: 100,
              marginBottom: 16,
            }}
          >
            Testimonials
          </div>
          <h2
            style={{
              fontSize: isMobile ? 28 : 36,
              fontWeight: 800,
              color: t.sHead,
            }}
          >
            What Clients Say
          </h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)",
            gap: 24,
          }}
        >
          {p.testimonials.map((rev) => (
            <div
              key={rev.id}
              style={{
                background: t.sCardAlt,
                borderRadius: 20,
                padding: 28,
                border: `1px solid ${t.sBorder}`,
              }}
            >
              <div style={{ display: "flex", gap: 2, marginBottom: 16 }}>
                {Array.from({ length: rev.rating }).map((_, i) => (
                  <Star key={i} size={14} fill={t.star} color={t.star} />
                ))}
              </div>
              <p
                style={{
                  color: t.sText,
                  fontSize: 14,
                  lineHeight: 1.7,
                  marginBottom: 20,
                  fontStyle: "italic",
                }}
              >
                &ldquo;{rev.review}&rdquo;
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    background: t.accGradWarm,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: t.accOn,
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  {rev.clientName.charAt(0)}
                </div>
                <div>
                  <div
                    style={{ fontWeight: 700, fontSize: 14, color: t.sHead }}
                  >
                    {rev.clientName}
                  </div>
                  <div style={{ fontSize: 12, color: t.sSubtle }}>
                    {rev.eventType} · {rev.date}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PublicFAQ({ isMobile }) {
  const p = usePortfolioData();
  const t = useT();
  const [open, setOpen] = useState(null);
  return (
    <section
      id="faq"
      style={{
        padding: isMobile ? "60px 20px" : "80px 40px",
        background: t.sBgAlt,
      }}
    >
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div
            style={{
              display: "inline-block",
              background: t.sChipBg,
              color: t.sChipText,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "4px 12px",
              borderRadius: 100,
              marginBottom: 16,
            }}
          >
            FAQ
          </div>
          <h2
            style={{
              fontSize: isMobile ? 28 : 36,
              fontWeight: 800,
              color: t.sHead,
            }}
          >
            Frequently Asked Questions
          </h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {p.faqs.map((faq) => (
            <div
              key={faq.id}
              style={{
                background: t.sCard,
                borderRadius: 14,
                border: `1px solid ${open === faq.id ? t.acc : t.sBorder}`,
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}
            >
              <button
                onClick={() => setOpen(open === faq.id ? null : faq.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "18px 20px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span
                  style={{ fontWeight: 600, fontSize: 15, color: t.sHead }}
                >
                  {faq.question}
                </span>
                {open === faq.id ? (
                  <ChevronUp size={18} color={t.accText} />
                ) : (
                  <ChevronDown size={18} color={t.sSubtle} />
                )}
              </button>
              {open === faq.id && (
                <div
                  style={{
                    padding: "0 20px 18px",
                    color: t.sText,
                    fontSize: 14,
                    lineHeight: 1.7,
                  }}
                >
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PublicContact({ isMobile }) {
  const p = usePortfolioData();
  const t = useT();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  // wa.me link built server-side from the portfolio owner's registered phone.
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    eventType: "",
    message: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (sending) return;
    // Phone is required and must be a real number; email is optional.
    if (!isValidPhoneNumber(form.phone)) {
      setError("Please enter a valid phone number.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await submitInquiry(p.slug, form);
      setWhatsappUrl(res?.data?.whatsappUrl || "");
      setSent(true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          "Failed to send your message. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  const inputStyle = {
    width: "100%",
    border: `1px solid ${t.inBorder}`,
    borderRadius: 10,
    padding: "11px 14px",
    fontSize: 14,
    color: t.inText,
    background: t.inBg,
    outline: "none",
    boxSizing: "border-box",
  };

  return (
    <section
      id="contact"
      style={{
        padding: isMobile ? "60px 20px" : "80px 40px",
        background: t.pBg,
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div
            style={{
              display: "inline-block",
              background: t.pChipBg,
              color: t.pChipText,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "4px 12px",
              borderRadius: 100,
              marginBottom: 16,
            }}
          >
            Contact
          </div>
          <h2
            style={{
              fontSize: isMobile ? 28 : 36,
              fontWeight: 800,
              color: t.pText,
            }}
          >
            Get in Touch
          </h2>
          <p
            style={{
              color: t.pTextMuted2,
              marginTop: 12,
              fontSize: 15,
            }}
          >
            Ready to book? I would love to hear about your vision.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1.4fr",
            gap: 40,
            alignItems: "start",
          }}
        >
          <div>
            {[
              {
                icon: <Phone size={18} color={t.accText} />,
                label: "Phone",
                value: p.phone,
              },
              {
                icon: <Mail size={18} color={t.accText} />,
                label: "Email",
                value: p.email,
              },
              {
                icon: <MapPin size={18} color={t.accText} />,
                label: "Location",
                value: p.location,
              },
            ].map((item) => (
              <div
                key={item.label}
                style={{ display: "flex", gap: 16, marginBottom: 24 }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    background: t.accTint,
                    borderRadius: 12,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div>
                  <div
                    style={{
                      color: t.pTextFaint,
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      marginBottom: 3,
                    }}
                  >
                    {item.label}
                  </div>
                  <div
                    style={{ color: t.pText, fontSize: 15, fontWeight: 500 }}
                  >
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              {[Instagram, Facebook, Youtube].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  style={{
                    width: 40,
                    height: 40,
                    background: t.pSoftIconBg,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: t.pSoftIconText,
                    textDecoration: "none",
                  }}
                >
                  <Icon size={18} />
                </a>
              ))}
              {/* Customer → Photographer: free wa.me chat link to the
                  photographer's phone (already shown publicly above). */}
              {whatsAppLink(p.phone || p.social?.whatsapp) && (
                <a
                  href={whatsAppLink(
                    p.phone || p.social?.whatsapp,
                    `Hi ${p.name || ""}, I found your portfolio on EventSnap and would like to enquire about a booking.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Chat on WhatsApp"
                  aria-label="Chat on WhatsApp"
                  style={{
                    width: 40,
                    height: 40,
                    background: t.pSoftIconBg,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: t.pSoftIconText,
                    textDecoration: "none",
                  }}
                >
                  <FaWhatsapp size={18} />
                </a>
              )}
            </div>
          </div>
          <div
            style={{
              background: t.pInset,
              border: `1px solid ${t.pInsetBorder}`,
              borderRadius: 20,
              padding: 28,
            }}
          >
            {sent ? (
              <div style={{ textAlign: "center", padding: "32px 0" }}>
                <CheckCircle
                  size={48}
                  color={t.success}
                  style={{ margin: "0 auto 16px" }}
                />
                <h3
                  style={{
                    color: t.pText,
                    fontSize: 20,
                    fontWeight: 700,
                    marginBottom: 8,
                  }}
                >
                  Inquiry Sent!
                </h3>
                <p style={{ color: t.pTextMuted2, fontSize: 14 }}>
                  I will get back to you within 24 hours.
                </p>
                {/* Free wa.me hand-off: opens WhatsApp to the portfolio
                    owner's registered phone (resolved on the server) with the
                    enquiry pre-filled — the customer still presses Send. */}
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 20,
                      background: "#25D366",
                      color: "#fff",
                      fontSize: 14,
                      fontWeight: 600,
                      padding: "10px 20px",
                      borderRadius: 10,
                      textDecoration: "none",
                    }}
                  >
                    <FaWhatsapp size={18} />
                    Also send on WhatsApp
                  </a>
                )}
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: 14,
                  }}
                >
                  <input
                    style={inputStyle}
                    placeholder="Your Name"
                    value={form.name}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    required
                  />
                  <input
                    style={inputStyle}
                    type="email"
                    placeholder="Email Address"
                    value={form.email}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                    gap: 14,
                  }}
                >
                  <input
                    style={inputStyle}
                    placeholder="Phone Number"
                    value={form.phone}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, phone: e.target.value }))
                    }
                    required
                  />
                  <select
                    style={{
                      ...inputStyle,
                      color: form.eventType ? t.inText : t.inPlaceholder,
                    }}
                    value={form.eventType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, eventType: e.target.value }))
                    }
                  >
                    <option value="">Event Type</option>
                    {[
                      "Wedding",
                      "Pre-Wedding",
                      "Portrait",
                      "Corporate",
                      "Event",
                      "Fashion",
                    ].map((opt) => (
                      <option key={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  style={{ ...inputStyle, resize: "none", height: 100 }}
                  placeholder="Tell me about your vision..."
                  value={form.message}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, message: e.target.value }))
                  }
                />
                {error && (
                  <p style={{ color: "#EF4444", fontSize: 13, margin: 0 }}>
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={sending}
                  style={{
                    background: t.accGrad,
                    color: t.accOn,
                    padding: "13px",
                    borderRadius: 10,
                    border: "none",
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: sending ? "default" : "pointer",
                    opacity: sending ? 0.7 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <Send size={16} />
                  {sending ? "Sending…" : "Send Inquiry"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function PublicCTA({ isMobile }) {
  const p = usePortfolioData();
  const t = useT();
  const ctaOverlay =
    t.name === "minimal"
      ? "rgba(255, 255, 255, 0.86)"
      : t.name === "light"
        ? "rgba(20, 22, 28, 0.55)"
        : "rgba(13, 11, 30, 0.85)";
  const ctaText = t.name === "minimal" ? "#1A1A1A" : "#FFFFFF";
  const ctaSub =
    t.name === "minimal" ? "#6B7280" : "rgba(255, 255, 255, 0.6)";
  return (
    <section
      style={{
        position: "relative",
        padding: isMobile ? "60px 20px" : "100px 40px",
        textAlign: "center",
        overflow: "hidden",
      }}
    >
      <img
        src={galleryImageSrc(p.gallery[0], "w=1400&h=600&fit=crop&auto=format")}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: ctaOverlay,
        }}
      />
      <div style={{ position: "relative" }}>
        <h2
          style={{
            fontSize: isMobile ? 28 : 44,
            fontWeight: 800,
            color: ctaText,
            marginBottom: 16,
          }}
        >
          Let&rsquo;s Capture Your Special Moments.
        </h2>
        <p
          style={{
            color: ctaSub,
            fontSize: isMobile ? 15 : 18,
            marginBottom: 32,
          }}
        >
          Book your session today and preserve your memories forever.
        </p>
        <a
          href="#contact"
          style={{
            display: "inline-block",
            background: t.accGradWarm,
            color: t.accOn,
            padding: "16px 36px",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 16,
            textDecoration: "none",
          }}
        >
          Book Your Photographer
        </a>
      </div>
    </section>
  );
}

function PublicFooter() {
  const p = usePortfolioData();
  const t = useT();
  return (
    <footer
      style={{
        background: t.pBg,
        borderTop: `1px solid ${t.pBorder}`,
        padding: "32px 40px",
      }}
    >
      <div
        style={{
          maxWidth: 1100,
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <div
            style={{
              color: t.pText,
              fontWeight: 700,
              fontSize: 16,
              marginBottom: 4,
            }}
          >
            {p.name}
          </div>
          <div style={{ color: t.pTextFaint, fontSize: 12 }}>
            {p.tagline}
          </div>
        </div>
        <div style={{ color: t.pTextFaint2, fontSize: 12 }}>
          Powered by{" "}
          <span style={{ color: t.accText, fontWeight: 600 }}>
            EventSnap.ai
          </span>
        </div>
      </div>
    </footer>
  );
}

export function PublicPortfolio({ isMobile }) {
  const p = usePortfolioData();
  const theme = buildTheme(p.theme, p.accent);
  return (
    <ThemeCtx.Provider value={theme}>
      <div
        style={{
          fontFamily: "'Inter', 'Poppins', sans-serif",
          color: theme.wrap,
          background: theme.pageBg,
          overflowX: "clip",
        }}
      >
        <PublicNav isMobile={isMobile} />
        <PublicHero isMobile={isMobile} />
        <PublicAbout isMobile={isMobile} />
        <PublicServices isMobile={isMobile} />
        <PublicGallery isMobile={isMobile} />
        <PublicPricing isMobile={isMobile} />
        <PublicTestimonials isMobile={isMobile} />
        <PublicFAQ isMobile={isMobile} />
        <PublicContact isMobile={isMobile} />
        <PublicCTA isMobile={isMobile} />
        <PublicFooter />
      </div>
    </ThemeCtx.Provider>
  );
}

// ─── Preview Wrapper ───────────────────────────────────────────────────────────

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export function PortfolioPreview() {
  const livePortfolio = usePortfolioData();
  const [device, setDevice] = useState("desktop");
  const config = DEVICE_CONFIG[device];
  const isMobile = device === "mobile";
  const isTablet = device === "tablet";

  // The public portfolio picks its layout from the isMobile prop, not CSS —
  // so when the preview frame itself is narrow (tablet/phone screens), render
  // the compact layout even in "Desktop" mode instead of a crushed desktop one.
  const frameRef = useRef(null);
  const [frameWidth, setFrameWidth] = useState(null);
  useEffect(() => {
    const el = frameRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => setFrameWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const narrowFrame = frameWidth !== null && frameWidth < 640;

  // Same live URL the QR code encodes (shown without "https://").
  const liveUrl = publicPortfolioUrl(livePortfolio.slug);
  const publicUrl = displayUrl(liveUrl);

  return (
    <div className={`pv-poppins space-y-4 ${poppins.className}`}>
      {/* Poppins for every piece of text in the preview — overrides the inline
          font stacks (and font-mono) set further down the tree. */}
      <style>{`
        .pv-poppins, .pv-poppins * {
          font-family: ${poppins.style.fontFamily} !important;
        }
      `}</style>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-[#1E1E1E]">
            Preview Portfolio
          </h2>
          <p className="text-gray-500 text-sm mt-0.5">
            See exactly how your public portfolio looks to clients
          </p>
        </div>
        <button
          type="button"
          onClick={() => liveUrl && window.open(liveUrl, "_blank", "noopener,noreferrer")}
          className="flex items-center gap-2 border border-[#6C63FF] text-[#6C63FF] px-4 py-2 rounded-lg text-sm hover:bg-[#EEF0FF] transition-colors"
        >
          <ExternalLink size={14} />
          Open Public Portfolio
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-gray-100 rounded-xl p-3 flex flex-wrap items-center gap-4 shadow-sm cursor-pointer dashboard-card">
        {/* Device toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1 gap-1">
          {Object.entries(DEVICE_CONFIG).map(([mode, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button
                key={mode}
                onClick={() => setDevice(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  device === mode
                    ? "bg-white shadow-sm text-[#6C63FF]"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon size={14} />
                {/* Icon-only on phone-width columns (label kept for screen readers). */}
                <span className="@max-[420px]:sr-only">{cfg.label}</span>
              </button>
            );
          })}
        </div>

        {/* URL bar */}
        <div className="flex-1 min-w-0 @max-[420px]:basis-full flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />
          <span className="text-xs text-gray-500 font-mono truncate">{publicUrl}</span>
        </div>

        <button className="flex items-center gap-1 text-gray-400 hover:text-gray-600 text-xs">
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {/* Preview frame */}
      <div
        ref={frameRef}
        className="bg-gray-200 rounded-2xl p-2 @min-[480px]:p-4 flex justify-center"
        style={{ minHeight: 600 }}
      >
        {/* Browser chrome — never wider than the frame it sits in */}
        <div
          className="bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col"
          style={{
            width: isMobile ? 390 : isTablet ? 768 : "100%",
            maxWidth: "100%",
          }}
        >
          {/* Browser top bar */}
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 border-b border-gray-200 flex-shrink-0">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="flex-1 min-w-0 truncate bg-white border border-gray-200 rounded-md px-3 py-1 text-xs text-gray-500 font-mono text-center">
              {publicUrl}
            </div>
          </div>

          {/* Portfolio content — scrollable */}
          <div className="flex-1 overflow-y-auto" style={{ maxHeight: 620 }}>
            <PublicPortfolio isMobile={isMobile || isTablet || narrowFrame} />
          </div>
        </div>
      </div>
    </div>
  );
}
