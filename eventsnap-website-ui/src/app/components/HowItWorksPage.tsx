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
        "Choose your account type (solo or studio)",
        "Set your services and pricing packages",
        "Upload portfolio photos for your booking page",
        "Configure your availability calendar",
      ],
    },
    {
      n: "02",
      icon: Globe,
      title: "Set Up Your Booking Page",
      desc: "Your custom booking page is live instantly. Share the link with clients or embed it on your existing website.",
      details: [
        "Branded booking page with your URL",
        "Package selection with pricing",
        "Availability calendar integration",
        "Automated deposit collection",
      ],
    },
    {
      n: "03",
      icon: FileText,
      title: "Clients Book & Sign Contracts",
      desc: "Clients pick a package, choose a date, e-sign your contract, and pay their deposit — all in one smooth flow.",
      details: [
        "E-signature on custom contracts",
        "Deposit auto-collected at booking",
        "Booking confirmation sent instantly",
        "Calendar invite added for both parties",
      ],
    },
    {
      n: "04",
      icon: Image,
      title: "Shoot & Deliver Galleries",
      desc: "After the shoot, upload edited photos to EventSnap. Your client gets a beautiful gallery link via email.",
      details: [
        "Bulk photo upload from any device",
        "Password-protected client galleries",
        "Download controls and expiry settings",
        "Mobile-optimized gallery viewing",
      ],
    },
    {
      n: "05",
      icon: CreditCard,
      title: "Invoice & Collect Final Payment",
      desc: "Send a final invoice with one click. Automated reminders follow up so you get paid without awkward conversations.",
      details: [
        "Professional branded invoices",
        "Online payment via Stripe",
        "Automated payment reminders",
        "Payment confirmation receipts",
      ],
    },
    {
      n: "06",
      icon: BarChart3,
      title: "Review & Grow",
      desc: "Check your analytics dashboard to see what's working, which packages are most popular, and where to focus next.",
      details: [
        "Revenue and booking dashboards",
        "Client source tracking",
        "Package performance analytics",
        "Monthly business summary emails",
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
            From signup to your first booking in under 10 minutes
          </h1>
          <p className="text-white/65 text-lg">
            No technical skills needed. EventSnap.ai is designed to be intuitive
            so you can start working with it immediately.
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
