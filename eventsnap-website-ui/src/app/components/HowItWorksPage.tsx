import { Camera, CreditCard, Image, BarChart3, Globe, FileText } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { FinalCTA } from "./FinalCTA";
import { PURPLE, CORAL, BRAND_GRADIENT, DARK_GRADIENT } from "./theme";
import type { Page } from "./types";

export function HowItWorksPage({ go }: { go: (p: Page) => void }) {
  const steps = [
    {
      n: "01",
      icon: Camera,
      title: "Create Your EventSnap.ai Account",
      desc: "Sign up free in under 2 minutes. No credit card needed. Add your studio name, logo, and services.",
      details: [
        "Add business profile and contact details",
        "Upload profile and studio photos",
        "Set up portfolio and service descriptions",
        "Keep your profile ready for inquiries and bookings",
      ],
    },
    {
      n: "02",
      icon: Globe,
      title: "Manage inquiries and bookings",
      desc: "Use the dashboard to track client messages, booking requests, status changes, and the booking details tied to each shoot or event.",
      details: [
        "Collect and organize inquiries",
        "Keep booking records in one place",
        "Confirm booking status and timelines",
        "Track payment and balance progress",
      ],
    },
    {
      n: "03",
      icon: FileText,
      title: "Build the event or portfolio flow",
      desc: "Create event galleries for weddings, shoots, and brand work, or publish a portfolio page that showcases your services and pricing in a clean public format.",
      details: [
        "Create and update event records",
        "Upload gallery photos and cover images",
        "Customize public portfolio content",
        "Control gallery and portfolio visibility",
      ],
    },
    {
      n: "04",
      icon: Image,
      title: "Share gallery access with clients or guests",
      desc: "Each event can use a public share link, QR code access, guest registration settings, and optional download controls depending on how you want the event to be viewed.",
      details: [
        "Public event links and QR codes",
        "Download restrictions and guest settings",
        "Guest registration support",
        "Public share flow for event viewing",
      ],
    },
    {
      n: "05",
      icon: CreditCard,
      title: "Track invoices and payments",
      desc: "Keep the money side of each booking visible in the dashboard with invoice records, payment totals, outstanding balances, and reminders.",
      details: [
        "Invoice history and balance tracking",
        "Payment totals by booking",
        "Reminder support for follow-ups",
        "Clear financial overview for each client",
      ],
    },
    {
      n: "06",
      icon: BarChart3,
      title: "Review the workflow and grow from there",
      desc: "Use the overview dashboard to monitor upcoming shoots, active bookings, gallery delivery, and day-to-day business activity without needing separate tools.",
      details: [
        "Upcoming bookings overview",
        "Active work and status tracking",
        "Operational notifications",
        "Simple business visibility in one dashboard",
      ],
    },
  ];

  return (
    <div>
      <section className="py-20" style={{ background: DARK_GRADIENT }}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionLabel color={CORAL}>How It Works</SectionLabel>
          <h1
            className="text-4xl sm:text-5xl font-bold text-white mb-5"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            From first inquiry to final gallery delivery
          </h1>
          <p className="text-white/65 text-lg">
            EventSnap is designed around the real lifecycle of a photography business:
            sell the work, manage the booking, deliver the gallery, and keep the admin out of the way.
          </p>
        </div>
      </section>
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {steps.map(({ n, icon: Icon, title, desc, details }, i) => (
              <div key={n} className="grid sm:grid-cols-12 gap-6 items-start">
                <div className="sm:col-span-1 flex flex-col items-center">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-white text-sm"
                    style={{ background: BRAND_GRADIENT }}
                  >
                    {n}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className="w-0.5 h-12 mt-3"
                      style={{ background: `${PURPLE}25` }}
                    />
                  )}
                </div>
                <div className="sm:col-span-11">
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-5 h-5" style={{ color: PURPLE }} />
                    <h3
                      className="font-bold text-lg text-foreground"
                      style={{ fontFamily: "Poppins, sans-serif" }}
                    >
                      {title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {desc}
                  </p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {details.map((d) => (
                      <div key={d} className="flex items-center gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ background: PURPLE }}
                        />
                        <span className="text-sm text-foreground">{d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FinalCTA go={go} />
    </div>
  );
}
