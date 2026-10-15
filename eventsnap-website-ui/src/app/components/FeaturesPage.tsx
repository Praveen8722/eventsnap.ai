import { Calendar, CreditCard, Image, BarChart3, Users, ArrowRight, Layers, FileText, Bell, Smartphone, Check } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { PrimaryBtn } from "./PrimaryBtn";
import { FinalCTA } from "./FinalCTA";
import { PURPLE, CORAL, DARK_GRADIENT } from "./theme";
import type { Page } from "./types";

export function FeaturesPage({ go }: { go: (p: Page) => void }) {
  return (
    <div>
      <section className="py-20" style={{ background: DARK_GRADIENT }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionLabel color={CORAL}>Features</SectionLabel>
          <h1
            className="text-4xl sm:text-5xl font-bold text-white mb-5"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            The dashboard photographers actually use to run the business
          </h1>
          <p className="text-white/65 text-lg max-w-2xl mx-auto mb-8">
            EventSnap brings together the workflows that happen after the shoot:
            bookings, inquiries, portfolio pages, event galleries, invoicing,
            guest access controls, and photo delivery — all in one place.
          </p>
          <PrimaryBtn onClick={() => go("signup")} size="lg">
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </PrimaryBtn>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Calendar,
                color: PURPLE,
                title: "Smart Booking & inquiry management",
                desc: "Track incoming inquiries, manage booking details, payment status, and client timelines without chasing updates across email and spreadsheets.",
                bullets: [
                  "Client booking records",
                  "Status history and follow-up tracking",
                  "Payment and remaining balance visibility",
                  "Owner-scoped dashboard access",
                ],
              },
              {
                icon: Image,
                color: CORAL,
                title: "Event photo galleries",
                desc: "Create shareable event galleries with public links, cover photos, guest access rules, and photo downloads that can be enabled or restricted by event.",
                bullets: [
                  "Public share links and QR codes",
                  "Event cover and gallery uploads",
                  "Guest registration and download settings",
                  "Photo delivery controls by event",
                ],
              },
              {
                icon: CreditCard,
                color: "#22c55e",
                title: "Invoices and payment tracking",
                desc: "Monitor booking invoices, payment totals, outstanding balances, and reminders from one dashboard built around actual client work.",
                bullets: [
                  "Invoice and payment history",
                  "Balance tracking by booking",
                  "Reminder workflow support",
                  "Financial visibility across active bookings",
                ],
              },
              {
                icon: Layers,
                color: "#f59e0b",
                title: "Portfolio website builder",
                desc: "Publish a photographer portfolio with service sections, gallery items, contact details, and a shareable public profile that matches your brand.",
                bullets: [
                  "Portfolio editing tools",
                  "Public profile and slug URLs",
                  "Photo gallery management",
                  "Brand and contact details",
                ],
              },
              {
                icon: Users,
                color: "#06b6d4",
                title: "Client and business profile data",
                desc: "Keep key data for each account in one secure place — name, business profile, contact details, and portfolio information tied to your dashboard account.",
                bullets: [
                  "Photographer profile management",
                  "Business and profile photo uploads",
                  "Company website sync support",
                  "Stored account data for business use",
                ],
              },
              {
                icon: BarChart3,
                color: "#a855f7",
                title: "Dashboard insights",
                desc: "Review the volume of bookings, upcoming work, delivery status, and account activity from the dashboard overview without leaving the product.",
                bullets: [
                  "Upcoming shoots dashboard",
                  "Booking status overview",
                  "Business summary at a glance",
                  "Status updates by client and event",
                ],
              },
              {
                icon: FileText,
                color: "#ec4899",
                title: "Inquiries and sales follow-up",
                desc: "Capture leads, respond to inquiries, and keep each client conversation tied to the corresponding booking or portfolio source.",
                bullets: [
                  "Inquiry collection",
                  "Portfolio-sourced bookings",
                  "Customer communication workflow",
                  "Follow-up tracking", 
                ],
              },
              {
                icon: Bell,
                color: "#f59e0b",
                title: "Notifications and reminders",
                desc: "Stay on top of bookings, updates, and work status without needing a separate notification system or external tool.",
                bullets: [
                  "Dismissible notifications",
                  "Booking status changes",
                  "Follow-up reminders",
                  "Inbox-style operational updates",
                ],
              },
              {
                icon: Smartphone,
                color: "#10b981",
                title: "Android camera auto-upload",
                desc: "Upload new camera photos directly into a selected event gallery from a connected Android device, without manual export for every batch.",
                bullets: [
                  "Background photo sync",
                  "Selected event targeting",
                  "Avoids duplicate uploads",
                  "Designed for on-location photo work",
                ],
              },
            ].map(({ icon: Icon, color, title, desc, bullets }) => (
              <div
                key={title}
                className="rounded-2xl border border-border p-6 hover:shadow-lg transition-all duration-300"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${color}15` }}
                >
                  <Icon className="w-6 h-6" style={{ color }} />
                </div>
                <h3
                  className="font-bold text-base text-foreground mb-2"
                  style={{ fontFamily: "Poppins, sans-serif" }}
                >
                  {title}
                </h3>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                  {desc}
                </p>
                <ul className="space-y-1.5">
                  {bullets.map((b) => (
                    <li
                      key={b}
                      className="flex items-center gap-2 text-sm text-foreground"
                    >
                      <Check
                        className="w-3.5 h-3.5 flex-shrink-0"
                        style={{ color: PURPLE }}
                      />
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FinalCTA go={go} />
    </div>
  );
}
