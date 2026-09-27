import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { FAQS_DATA } from "./data";

export function FAQSectionHome() {
  const [open, setOpen] = useState<number | null>(null);
  const items = FAQS_DATA.slice(0, 6);
  return (
    <section className="py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <SectionLabel>FAQ</SectionLabel>
          <h2
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Frequently asked questions
          </h2>
          <p className="text-muted-foreground text-lg">
            Everything you need to know before getting started.
          </p>
        </div>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div
              key={i}
              className="border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors"
            >
              <button
                className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                onClick={() => setOpen(open === i ? null : i)}
              >
                <span className="font-medium text-foreground text-sm">
                  {item.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform ${open === i ? "rotate-180" : ""}`}
                />
              </button>
              {open === i && (
                <div className="px-5 pb-4">
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
  );
}
