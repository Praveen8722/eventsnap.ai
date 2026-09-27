import {
  Camera,
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  Heart,
} from "lucide-react";
import { PURPLE, CORAL, DARK, BRAND_GRADIENT } from "./theme";
import type { Page } from "./types";

export function Footer({ go }: { go: (p: Page) => void }) {
  const navigate = (p: Page) => {
    go(p);
    window.scrollTo(0, 0);
  };
  const cols: { title: string; links: { label: string; page: Page }[] }[] = [
    {
      title: "Product",
      links: [
        { label: "Features", page: "features" },
        { label: "How It Works", page: "how-it-works" },
        { label: "For Photographers", page: "for-photographers" },
        { label: "Pricing", page: "pricing" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About Us", page: "about" },
        { label: "Contact Us", page: "contact" },
        { label: "FAQ", page: "faq" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Privacy Policy", page: "privacy" },
        { label: "Terms of Service", page: "terms" },
        { label: "Refund Policy", page: "refund" },
      ],
    },
  ];

  return (
    <footer style={{ background: DARK }} className="text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-14">
          <div className="lg:col-span-2">
            <button
              onClick={() => navigate("home")}
              className="flex items-center gap-2 mb-4"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: BRAND_GRADIENT }}
              >
                <Camera className="w-4 h-4 text-white" />
              </div>
              <span
                className="font-bold text-xl"
                style={{ fontFamily: "Poppins, sans-serif" }}
              >
                EventSnap<span style={{ color: PURPLE }}>.ai</span>
              </span>
            </button>
            <p className="text-white/55 text-sm leading-relaxed mb-6 max-w-xs">
              The all-in-one business platform built for photographers. Manage
              bookings, clients, galleries, and payments — all in one place.
            </p>
            <div className="flex gap-2.5">
              {[Twitter, Instagram, Linkedin, Facebook].map((Icon, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 cursor-pointer transition-colors"
                >
                  <Icon className="w-4 h-4 text-white/70" />
                </div>
              ))}
            </div>
          </div>
          {cols.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-xs tracking-widest uppercase text-white/50 mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5">
                {col.links.map(({ label, page }) => (
                  <li key={page}>
                    <button
                      onClick={() => navigate(page)}
                      className="text-sm text-white/55 hover:text-white transition-colors"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/35 text-sm">
            © 2025 EventSnap.ai, Inc. All rights reserved.
          </p>
          <p className="text-white/35 text-sm flex items-center gap-1.5">
            Made with{" "}
            <Heart
              className="w-3.5 h-3.5 fill-current text-coral"
              style={{ color: CORAL }}
            />{" "}
            for photographers everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}
