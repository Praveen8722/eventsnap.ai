import { ArrowRight } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { PrimaryBtn } from "./PrimaryBtn";
import { PURPLE, BRAND_GRADIENT } from "./theme";
import { STEPS_DATA } from "./data";
import type { Page } from "./types";

export function HowItWorksSection({ go }: { go: (p: Page) => void }) {
  return (
    <section className="py-24" style={{ background: "#f7f6ff" }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <SectionLabel>Simple Process</SectionLabel>
          <h2
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Up and running in under 10 minutes
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            No complex setup. No developer required. Start accepting bookings
            and payments on day one.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-border" />
          {STEPS_DATA.map(({ step, title, desc, icon: Icon }, i) => (
            <div key={step} className="relative text-center">
              <div className="relative inline-flex mb-6">
                <div
                  className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto shadow-lg"
                  style={{
                    background: i === 1 ? BRAND_GRADIENT : "white",
                    border: i !== 1 ? `2px solid ${PURPLE}25` : "none",
                  }}
                >
                  <Icon
                    className="w-9 h-9"
                    style={{ color: i === 1 ? "white" : PURPLE }}
                  />
                </div>
                <div
                  className="absolute -top-3 -right-3 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: BRAND_GRADIENT }}
                >
                  {i + 1}
                </div>
              </div>
              <h3
                className="font-semibold text-lg text-foreground mb-3"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                {title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
                {desc}
              </p>
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <PrimaryBtn onClick={() => go("signup")} size="lg">
            Get Started Free <ArrowRight className="w-4 h-4" />
          </PrimaryBtn>
        </div>
      </div>
    </section>
  );
}
