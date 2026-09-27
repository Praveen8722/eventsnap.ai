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
            Built for the way photographers actually work
          </h1>
          <p className="text-white/65 text-lg max-w-2xl mx-auto mb-8">
            Every feature in EventSnap.ai was designed with real photographers
            in mind — solving real problems, reducing real admin, and helping
            you earn more.
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
                title: "Smart Booking Management",
                desc: "Accept bookings 24/7 from a beautiful, branded booking page. Clients choose a package, pick a date, sign a contract, and pay a deposit — all automatically.",
                bullets: [
                  "Custom booking page URL",
                  "Package and pricing display",
                  "Real-time availability calendar",
                  "Automated confirmations and reminders",
                ],
              },
              {
                icon: Image,
                color: CORAL,
                title: "Client Gallery Delivery",
                desc: "Deliver edited photos in stunning, password-protected online galleries. Control downloads, sharing, and expiry from your dashboard.",
                bullets: [
                  "Unlimited photo uploads (Pro)",
                  "Password and expiry controls",
                  "HD & print-ready downloads",
                  "Mobile-optimized viewing experience",
                ],
              },
              {
                icon: CreditCard,
                color: "#22c55e",
                title: "Payments & Invoicing",
                desc: "Collect deposits and final payments online via Stripe. Send professional invoices and automate payment reminders so you always get paid on time.",
                bullets: [
                  "Stripe integration for online payments",
                  "Deposit and balance automation",
                  "Professional branded invoices",
                  "Automated payment reminders",
                ],
              },
              {
                icon: Layers,
                color: "#f59e0b",
                title: "Kanban Project Workflows",
                desc: "Visualize every project from inquiry to delivery on a Kanban board. Move cards, assign tasks, and track progress across all your active shoots.",
                bullets: [
                  "Drag-and-drop Kanban boards",
                  "Custom workflow stages",
                  "Task checklists per project",
                  "Automated stage transitions",
                ],
              },
              {
                icon: Users,
                color: "#06b6d4",
                title: "Client Relationship Manager",
                desc: "Keep all your client information, shoot history, notes, and communication in one organized place. Never lose a detail again.",
                bullets: [
                  "Complete client profiles",
                  "Shoot and invoice history",
                  "Internal notes and tags",
                  "Contact form integrations",
                ],
              },
              {
                icon: BarChart3,
                color: "#a855f7",
                title: "Business Analytics",
                desc: "Track revenue, booking trends, gallery views, and client retention with visual dashboards and exportable reports.",
                bullets: [
                  "Revenue and income tracking",
                  "Booking conversion analytics",
                  "Monthly and annual reports",
                  "Exportable PDF and CSV reports",
                ],
              },
              {
                icon: FileText,
                color: "#ec4899",
                title: "Contracts & E-Signatures",
                desc: "Create professional contracts from templates, customize them for each client, and collect legally binding e-signatures instantly.",
                bullets: [
                  "Professional contract templates",
                  "Custom contract fields",
                  "Legally binding e-signatures",
                  "Automatic contract archiving",
                ],
              },
              {
                icon: Bell,
                color: "#f59e0b",
                title: "Automated Workflows",
                desc: "Set up email automations and reminders that run on autopilot — from booking confirmation to gallery delivery follow-up.",
                bullets: [
                  "Booking confirmation emails",
                  "Pre-shoot reminder sequences",
                  "Invoice follow-up automations",
                  "Gallery delivery notifications",
                ],
              },
              {
                icon: Smartphone,
                color: "#10b981",
                title: "Mobile App",
                desc: "Full-featured iOS and Android app so you can manage your business from anywhere — between shoots, on location, or at home.",
                bullets: [
                  "iOS and Android native apps",
                  "Real-time booking notifications",
                  "Quick invoice creation on mobile",
                  "Gallery upload from phone",
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
