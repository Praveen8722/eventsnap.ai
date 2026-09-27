import { Star, ArrowRight, Bell, Play } from "lucide-react";
import { PrimaryBtn } from "./PrimaryBtn";
import { OutlineBtn } from "./OutlineBtn";
import { PURPLE, CORAL, DARK, BRAND_GRADIENT, DARK_GRADIENT } from "./theme";
import type { Page } from "./types";

export function HeroSection({ go }: { go: (p: Page) => void }) {
  return (
    <section
      className="relative overflow-hidden"
      style={{ background: DARK_GRADIENT }}
    >
      {/* Glow blobs */}
      <div
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full opacity-25 blur-3xl pointer-events-none"
        style={{ background: PURPLE }}
      />
      <div
        className="absolute bottom-0 right-0 w-80 h-80 rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: CORAL }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div className="relative z-10">
            <div
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold mb-7"
              style={{
                backgroundColor: `${PURPLE}30`,
                color: "#b8b2ff",
                border: `1px solid ${PURPLE}40`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Trusted by 10,000+ photographers worldwide
            </div>

            <h1
              className="text-4xl sm:text-5xl xl:text-6xl font-bold text-white leading-[1.1] mb-6"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              Grow Your
              <span
                className="block"
                style={{
                  WebkitTextFillColor: "transparent",
                  WebkitBackgroundClip: "text",
                  backgroundImage: BRAND_GRADIENT,
                  backgroundClip: "text",
                }}
              >
                Photography
              </span>
              Business — Faster.
            </h1>

            <p className="text-white/65 text-lg leading-relaxed mb-9 max-w-lg">
              EventSnap.ai is the all-in-one platform for photographers to
              manage bookings, clients, galleries, payments, and workflows —
              from first inquiry to final delivery.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <PrimaryBtn onClick={() => go("signup")} size="lg">
                Start Free — No Card Required
                <ArrowRight className="w-4 h-4" />
              </PrimaryBtn>
              <OutlineBtn dark>
                <Play className="w-4 h-4" />
                Watch 2-Min Demo
              </OutlineBtn>
            </div>

            {/* Social proof row */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex -space-x-2.5">
                {[
                  "1573496359142-b8d87734a5a2",
                  "1507003211169-0a1dd7228f2d",
                  "1580489944761-15a19d654956",
                ].map((id) => (
                  <img
                    key={id}
                    src={`https://images.unsplash.com/photo-${id}?w=40&h=40&fit=crop&auto=format`}
                    alt="Photographer"
                    className="w-9 h-9 rounded-full border-2 object-cover"
                    style={{ borderColor: DARK }}
                  />
                ))}
                <div
                  className="w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white"
                  style={{ borderColor: DARK, background: PURPLE }}
                >
                  +9k
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                  <span className="text-white font-semibold text-sm ml-1">
                    4.9
                  </span>
                </div>
                <p className="text-white/45 text-xs mt-0.5">
                  from 2,400+ verified reviews
                </p>
              </div>
              <div className="hidden sm:block h-8 w-px bg-white/15" />
              <div className="hidden sm:block">
                <p className="text-white font-semibold text-sm">$2.4M+</p>
                <p className="text-white/45 text-xs mt-0.5">
                  paid to photographers monthly
                </p>
              </div>
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="relative hidden lg:block">
            <div
              className="rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
              style={{ background: "#1e1a3e", border: `1px solid ${PURPLE}35` }}
            >
              {/* Window chrome */}
              <div
                className="flex items-center gap-2 px-4 py-3"
                style={{ background: "#13102e" }}
              >
                <div className="w-3 h-3 rounded-full bg-red-400/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-400/80" />
                <div className="flex-1 mx-3">
                  <div className="bg-white/8 rounded-md h-5 flex items-center px-3">
                    <span className="text-white/30 text-xs">
                      app.eventsnap.ai/dashboard
                    </span>
                  </div>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-white/40 text-xs">
                      Good morning, Sarah ☀️
                    </p>
                    <p className="text-white font-semibold text-sm mt-0.5">
                      Dashboard Overview
                    </p>
                  </div>
                  <div
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                    style={{ background: BRAND_GRADIENT }}
                  >
                    + New Booking
                  </div>
                </div>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-2.5 mb-4">
                  {[
                    {
                      label: "Bookings",
                      value: "24",
                      badge: "+3 this week",
                      good: true,
                    },
                    {
                      label: "Revenue",
                      value: "$8,420",
                      badge: "+18%",
                      good: true,
                    },
                    {
                      label: "Galleries",
                      value: "12",
                      badge: "4 pending",
                      good: false,
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl p-3"
                      style={{ background: `${PURPLE}20` }}
                    >
                      <p className="text-white/40 text-xs mb-1">{s.label}</p>
                      <p className="text-white font-bold text-sm">{s.value}</p>
                      <p
                        className={`text-xs mt-1 ${s.good ? "text-emerald-400" : "text-amber-400"}`}
                      >
                        {s.badge}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Bookings list */}
                <div
                  className="rounded-xl p-3.5"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <p className="text-white/30 text-xs font-semibold tracking-widest uppercase mb-3">
                    Recent Bookings
                  </p>
                  {[
                    {
                      name: "Emma & James — Wedding",
                      date: "Dec 15",
                      status: "Confirmed",
                      amount: "$2,800",
                    },
                    {
                      name: "TechCo Corporate Headshots",
                      date: "Dec 18",
                      status: "Pending",
                      amount: "$650",
                    },
                    {
                      name: "Holiday Family Session",
                      date: "Dec 20",
                      status: "Confirmed",
                      amount: "$380",
                    },
                  ].map((b) => (
                    <div
                      key={b.name}
                      className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
                    >
                      <div>
                        <p className="text-white text-xs font-medium">
                          {b.name}
                        </p>
                        <p className="text-white/35 text-xs mt-0.5">{b.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-xs font-semibold">
                          {b.amount}
                        </p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full mt-0.5 inline-block ${b.status === "Confirmed" ? "text-emerald-400 bg-emerald-400/10" : "text-amber-400 bg-amber-400/10"}`}
                        >
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Floating cards */}
            <div className="absolute -left-10 bottom-20 bg-white rounded-2xl shadow-xl p-3.5 w-52">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: `${PURPLE}18` }}
                >
                  <Bell className="w-4 h-4" style={{ color: PURPLE }} />
                </div>
                <div>
                  <p className="text-foreground text-xs font-semibold">
                    New Booking! 🎉
                  </p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Wedding — June 2025
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -right-6 top-20 bg-white rounded-2xl shadow-xl p-3.5 w-44">
              <p className="text-muted-foreground text-xs mb-1">
                Payment received
              </p>
              <p className="font-bold text-lg" style={{ color: "#22c55e" }}>
                +$1,200
              </p>
              <p className="text-muted-foreground text-xs">
                Corporate shoot deposit
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
