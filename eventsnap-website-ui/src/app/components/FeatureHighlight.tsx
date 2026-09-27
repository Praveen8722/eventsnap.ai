import { ArrowRight, Check } from "lucide-react";
import { SectionLabel } from "./SectionLabel";
import { OutlineBtn } from "./OutlineBtn";
import { PURPLE } from "./theme";
import type { Page } from "./types";

export function FeatureHighlight({
  label,
  title,
  desc,
  bullets,
  imgId,
  imgAlt,
  reverse = false,
  go,
  page,
}: {
  label: string;
  title: string;
  desc: string;
  bullets: string[];
  imgId: string;
  imgAlt: string;
  reverse?: boolean;
  go: (p: Page) => void;
  page: Page;
}) {
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div
          className={`grid lg:grid-cols-2 gap-14 items-center ${reverse ? "lg:flex-row-reverse" : ""}`}
          style={{ direction: reverse ? "rtl" : "ltr" }}
        >
          <div style={{ direction: "ltr" }}>
            <SectionLabel>{label}</SectionLabel>
            <h2
              className="text-3xl sm:text-4xl font-bold text-foreground mb-5 leading-tight"
              style={{ fontFamily: "Poppins, sans-serif" }}
            >
              {title}
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed mb-7">
              {desc}
            </p>
            <ul className="space-y-3 mb-8">
              {bullets.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${PURPLE}15` }}
                  >
                    <Check className="w-3 h-3" style={{ color: PURPLE }} />
                  </div>
                  <span className="text-foreground text-sm leading-relaxed">
                    {b}
                  </span>
                </li>
              ))}
            </ul>
            <OutlineBtn onClick={() => go(page)}>
              Learn more <ArrowRight className="w-4 h-4" />
            </OutlineBtn>
          </div>
          <div className="relative" style={{ direction: "ltr" }}>
            <div
              className="rounded-3xl overflow-hidden shadow-2xl"
              style={{ background: "#f0efff" }}
            >
              <img
                src={`https://images.unsplash.com/photo-${imgId}?w=700&h=480&fit=crop&auto=format`}
                alt={imgAlt}
                className="w-full h-72 sm:h-80 object-cover"
              />
            </div>
            <div className="absolute -bottom-5 -left-5 bg-white rounded-2xl shadow-xl p-4 max-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-foreground">
                  Live & Active
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                New booking just received for your wedding package
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
