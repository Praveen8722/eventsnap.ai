import { useState } from "react";
import { Camera, Menu, X } from "lucide-react";
import { PrimaryBtn } from "./PrimaryBtn";
import { PURPLE, BRAND_GRADIENT } from "./theme";
import type { Page } from "./types";

export function Navbar({ current, go }: { current: Page; go: (p: Page) => void }) {
  const [open, setOpen] = useState(false);
  const nav: { label: string; page: Page }[] = [
    { label: "Features", page: "features" },
    { label: "How It Works", page: "how-it-works" },
    { label: "For Photographers", page: "for-photographers" },
    { label: "Pricing", page: "pricing" },
    { label: "About", page: "about" },
  ];
  const navigate = (p: Page) => {
    go(p);
    setOpen(false);
    window.scrollTo(0, 0);
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <button
          onClick={() => navigate("home")}
          className="flex items-center gap-2"
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

        <nav className="hidden md:flex items-center gap-7">
          {nav.map(({ label, page }) => (
            <button
              key={page}
              onClick={() => navigate(page)}
              className={`text-sm font-medium transition-colors ${current === page ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate("login")}
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-3 py-2"
          >
            Log In
          </button>
          <PrimaryBtn onClick={() => navigate("signup")} size="sm">
            Get Started Free
          </PrimaryBtn>
        </div>

        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setOpen(!open)}
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-white px-4 py-4 space-y-1">
          {nav.map(({ label, page }) => (
            <button
              key={page}
              onClick={() => navigate(page)}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              {label}
            </button>
          ))}
          <div className="pt-3 mt-2 border-t border-border flex flex-col gap-2">
            <button
              onClick={() => navigate("login")}
              className="text-sm font-medium py-2.5 border border-border rounded-xl hover:bg-muted transition-colors"
            >
              Log In
            </button>
            <button
              onClick={() => navigate("signup")}
              className="text-sm font-semibold py-2.5 text-white rounded-xl"
              style={{ background: BRAND_GRADIENT }}
            >
              Get Started Free
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
