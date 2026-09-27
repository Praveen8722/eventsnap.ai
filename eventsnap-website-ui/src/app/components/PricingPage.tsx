import { CheckCircle } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { PricingSection } from "./PricingSection";
import { FAQSectionHome } from "./FAQSectionHome";
import { FinalCTA } from "./FinalCTA";
import { PURPLE, CORAL, DARK_GRADIENT } from "./theme";
import type { Page } from "./types";

export function PricingPage({ go }: { go: (p: Page) => void }) {
  return (
    <div>
      <section className="py-16" style={{ background: DARK_GRADIENT }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionLabel color={CORAL}>Pricing</SectionLabel>
          <h1
            className="text-4xl sm:text-5xl font-bold text-white mb-5"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Simple pricing for every photographer
          </h1>
          <p className="text-white/65 text-lg">
            Start free. Scale as you grow. No hidden fees, no surprises.
          </p>
        </div>
      </section>
      <PricingSection go={go} standalone />
      <section className="py-16 bg-white border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-2xl font-bold text-foreground mb-8 text-center"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            All plans include
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "SSL-secured data encryption",
              "99.9% uptime guarantee",
              "Mobile iOS & Android app",
              "Free onboarding walkthrough",
              "Stripe-powered payments",
              "GDPR compliant infrastructure",
              "Regular feature updates",
              "Community & resource library",
              "14-day free trial on paid plans",
            ].map((f) => (
              <div
                key={f}
                className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40"
              >
                <CheckCircle
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: PURPLE }}
                />
                <span className="text-sm text-foreground">{f}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <FAQSectionHome />
      <FinalCTA go={go} />
    </div>
  );
}
