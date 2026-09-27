import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { FinalCTA } from "./FinalCTA";
import { CORAL, DARK_GRADIENT } from "./theme";
import { FAQS_DATA } from "./data";
import type { Page } from "./types";

export function FAQPage({ go }: { go: (p: Page) => void }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div>
      <section className="py-16" style={{ background: DARK_GRADIENT }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <SectionLabel color={CORAL}>FAQ</SectionLabel>
          <h1
            className="text-4xl sm:text-5xl font-bold text-white mb-4"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Frequently asked questions
          </h1>
          <p className="text-white/65 text-lg">
            Can't find what you're looking for?{" "}
            <button
              onClick={() => go("contact")}
              className="underline hover:no-underline"
              style={{ color: "#b8b2ff" }}
            >
              Contact us
            </button>{" "}
            and we'll help.
          </p>
        </div>
      </section>
      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-3">
            {FAQS_DATA.map((item, i) => (
              <div
                key={i}
                className="border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors"
              >
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                  onClick={() => setOpen(open === i ? null : i)}
                >
                  <span className="font-medium text-foreground">{item.q}</span>
                  <ChevronDown
                    className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform ${open === i ? "rotate-180" : ""}`}
                  />
                </button>
                {open === i && (
                  <div className="px-5 pb-5">
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
      <FinalCTA go={go} />
    </div>
  );
}
