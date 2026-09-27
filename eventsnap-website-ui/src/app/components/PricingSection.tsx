import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { CORAL, BRAND_GRADIENT, DARK_GRADIENT } from "./theme";
import { PRICING_DATA } from "./data";
import type { Page } from "./types";

export function PricingSection({
  go,
  standalone = false,
}: {
  go: (p: Page) => void;
  standalone?: boolean;
}) {
  const [annual, setAnnual] = useState(true);
  return (
    <section className={`py-24 ${standalone ? "bg-white" : "bg-white"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          {!standalone && <SectionLabel>Pricing</SectionLabel>}
          <h2
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-7">
            Start free. Upgrade when you're ready. No hidden fees, no long-term
            contracts.
          </p>
          {/* Toggle */}
          <div className="inline-flex items-center gap-3 bg-muted rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${!annual ? "bg-white shadow text-foreground" : "text-muted-foreground"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${annual ? "bg-white shadow text-foreground" : "text-muted-foreground"}`}
            >
              Annual{" "}
              <span
                className="ml-1.5 text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{ background: `${CORAL}18`, color: CORAL }}
              >
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {PRICING_DATA.map(
            ({ name, price, description, features, cta, featured }) => (
              <div
                key={name}
                className={`rounded-2xl p-7 relative transition-all ${featured ? "shadow-2xl scale-105" : "border border-border hover:shadow-md"}`}
                style={
                  featured
                    ? { background: DARK_GRADIENT }
                    : { background: "white" }
                }
              >
                {featured && (
                  <div
                    className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold text-white"
                    style={{ background: BRAND_GRADIENT }}
                  >
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <p
                    className={`font-semibold text-lg mb-1 ${featured ? "text-white" : "text-foreground"}`}
                    style={{ fontFamily: "Poppins, sans-serif" }}
                  >
                    {name}
                  </p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span
                      className={`text-4xl font-bold ${featured ? "text-white" : "text-foreground"}`}
                      style={{ fontFamily: "Poppins, sans-serif" }}
                    >
                      {price.monthly === 0
                        ? "Free"
                        : `$${annual ? price.annual : price.monthly}`}
                    </span>
                    {price.monthly > 0 && (
                      <span
                        className={`text-sm ${featured ? "text-white/50" : "text-muted-foreground"}`}
                      >
                        /mo
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-sm ${featured ? "text-white/60" : "text-muted-foreground"}`}
                  >
                    {description}
                  </p>
                </div>
                <ul className="space-y-3 mb-8">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <CheckCircle
                        className={`w-4 h-4 flex-shrink-0 mt-0.5 ${featured ? "text-emerald-400" : "text-primary"}`}
                      />
                      <span
                        className={`text-sm ${featured ? "text-white/80" : "text-foreground"}`}
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => go("signup")}
                  className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${featured ? "text-white hover:opacity-90" : "border border-primary hover:bg-primary/5 text-primary"}`}
                  style={featured ? { background: BRAND_GRADIENT } : {}}
                >
                  {cta}
                </button>
              </div>
            ),
          )}
        </div>

        <p className="text-center text-muted-foreground text-sm mt-8">
          All paid plans include a 14-day free trial. Cancel anytime.
        </p>
      </div>
    </section>
  );
}
