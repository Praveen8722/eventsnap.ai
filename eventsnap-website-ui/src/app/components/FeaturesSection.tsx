import { ArrowRight } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { OutlineBtn } from "./OutlineBtn";
import { FEATURES_DATA } from "./data";
import type { Page } from "./types";

export function FeaturesSection({ go }: { go: (p: Page) => void }) {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <SectionLabel>All-in-One Platform</SectionLabel>
          <h2
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            Every tool your photography
            <br />
            business actually needs
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Stop juggling spreadsheets, separate apps, and missed emails.
            EventSnap.ai brings your entire business into one beautiful,
            connected platform.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES_DATA.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="group rounded-2xl p-6 border border-border hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default"
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <h3
                className="font-semibold text-foreground text-sm mb-2"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                {title}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {desc}
              </p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <OutlineBtn onClick={() => go("features")}>
            Explore all features <ArrowRight className="w-4 h-4" />
          </OutlineBtn>
        </div>
      </div>
    </section>
  );
}
