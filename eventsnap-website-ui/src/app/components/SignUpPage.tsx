import { useEffect } from "react";
import { Camera, Loader2 } from "lucide-react";
import { PURPLE, BRAND_GRADIENT, DARK_GRADIENT } from "./theme";
import type { Page } from "./types";

// EventSnap authentication is the single source of truth — this page never
// re-implements signup. It just hands the visitor off to the real, existing
// EventSnap signup page (eventsnap-dashboard-ui), which creates the account in
// eventSnapDB exactly as it always has and takes the user straight to their
// Pro Dashboard on success.
// Hosted dashboard on GitHub Pages (VITE_DASHBOARD_URL), local dev server otherwise.
const EVENTSNAP_APP_URL =
  import.meta.env.VITE_DASHBOARD_URL || "http://localhost:3000";
const EVENTSNAP_SIGNUP_URL = `${EVENTSNAP_APP_URL}/signup`;

export function SignUpPage({ go }: { go: (p: Page) => void }) {
  useEffect(() => {
    window.location.href = EVENTSNAP_SIGNUP_URL;
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: DARK_GRADIENT }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <button
          onClick={() => go("home")}
          className="flex items-center justify-center gap-2 mb-6 mx-auto"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: BRAND_GRADIENT }}
          >
            <Camera className="w-4 h-4 text-white" />
          </div>
          <span
            className="font-bold text-xl text-foreground"
            style={{ fontFamily: "Poppins, sans-serif" }}
          >
            EventSnap<span style={{ color: PURPLE }}>.ai</span>
          </span>
        </button>
        <Loader2
          className="w-6 h-6 animate-spin mx-auto mb-4"
          style={{ color: PURPLE }}
        />
        <p className="text-foreground font-medium mb-1">
          Taking you to secure sign up…
        </p>
        <p className="text-muted-foreground text-sm mb-4">
          You're being redirected to create your EventSnap Pro account.
        </p>
        <a
          href={EVENTSNAP_SIGNUP_URL}
          className="text-sm font-medium hover:underline"
          style={{ color: PURPLE }}
        >
          Click here if you're not redirected automatically
        </a>
      </div>
    </div>
  );
}
