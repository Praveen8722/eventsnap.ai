import { HeroSection } from "./HeroSection";
import { StatsBar } from "./StatsBar";
import { FeaturesSection } from "./FeaturesSection";
import { HowItWorksSection } from "./HowItWorksSection";
import { FeatureHighlight } from "./FeatureHighlight";
import { AnalyticsSection } from "./AnalyticsSection";
import { PricingSection } from "./PricingSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { FAQSectionHome } from "./FAQSectionHome";
import { FinalCTA } from "./FinalCTA";
import { PaymentsDeepDive } from "./PaymentsDeepDive";
import type { Page } from "./types";

export function HomePage({ go }: { go: (p: Page) => void }) {
  return (
    <>
      <HeroSection go={go} />
      <StatsBar />
      <FeaturesSection go={go} />
      <HowItWorksSection go={go} />
      <FeatureHighlight
        label="Booking Management"
        title="Never miss a booking again"
        desc="Your clients can book 24/7 from a beautiful, mobile-optimized page. Automated confirmations, deposits, reminders, and contract signing — all handled for you."
        bullets={[
          "Custom booking page with your branding and pricing",
          "Automated deposit collection at booking",
          "Smart reminder emails before every shoot",
          "Two-way calendar sync with Google and Apple",
        ]}
        imgId="1492691527719-9d1e07e534b4"
        imgAlt="Photographer at an event shoot"
        go={go}
        page="features"
      />
      <FeatureHighlight
        label="Client Galleries"
        title="Wow your clients with stunning photo delivery"
        desc="Upload edited photos and share a password-protected, mobile-beautiful gallery. Your clients can browse, favorite, and download — exactly how you want them to."
        bullets={[
          "Unlimited storage on Pro and Studio plans",
          "Password protection with expiry controls",
          "HD and print-resolution download options",
          "Shareable links clients can send to family",
        ]}
        imgId="1516035069371-29a1b244cc32"
        imgAlt="Beautiful camera and photography setup"
        reverse
        go={go}
        page="features"
      />
      <PaymentsDeepDive go={go} />

      <AnalyticsSection />
      <PricingSection go={go} />
      <TestimonialsSection />
      <FAQSectionHome />
      <FinalCTA go={go} />
    </>
  );
}
