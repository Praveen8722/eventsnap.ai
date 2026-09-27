import { ArrowRight } from "lucide-react";
import { PrimaryBtn } from "./PrimaryBtn";
import { OutlineBtn } from "./OutlineBtn";
import { PURPLE, CORAL, DARK_GRADIENT } from "./theme";
import type { Page } from "./types";

export function FinalCTA({ go }: { go: (p: Page) => void }) {
  return (
    <section
      className="py-24 relative overflow-hidden"
      style={{ background: DARK_GRADIENT }}
    >
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-20 -left-20 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ background: PURPLE }}
        />
        <div
          className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full opacity-20 blur-3xl"
          style={{ background: CORAL }}
        />
      </div>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <h2
          className="text-3xl sm:text-5xl font-bold text-white mb-5 leading-tight"
          style={{ fontFamily: "Poppins, sans-serif" }}
        >
          Ready to grow your photography business?
        </h2>
        <p className="text-white/60 text-lg mb-10">
          Join 10,000+ photographers who manage their entire business with
          EventSnap.ai. Start free — no credit card required.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <PrimaryBtn onClick={() => go("signup")} size="lg">
            Start your free 14-day trial today{" "}
            <ArrowRight className="w-4 h-4" />
          </PrimaryBtn>
          <OutlineBtn dark onClick={() => go("contact")}>
            Talk to Sales
          </OutlineBtn>
        </div>
        <p className="text-white/35 text-sm mt-6">
          No credit card • Free forever plan • Cancel anytime
        </p>
      </div>
    </section>
  );
}
