import { useEffect } from "react";
import { Camera, Loader2 } from "lucide-react";
import { PURPLE, BRAND_GRADIENT, DARK_GRADIENT } from "./theme";
import type { Page } from "./types";

// EventSnap authentication is the single source of truth — this page never
// re-implements login. It just hands the visitor off to the real, existing
// EventSnap login page (eventsnap-dashboard-ui), which authenticates against
// eventSnapDB exactly as it always has and takes the user straight to their
// Pro Dashboard on success.
const EVENTSNAP_APP_URL = "http://localhost:3000";
const EVENTSNAP_LOGIN_URL = `${EVENTSNAP_APP_URL}/login`;

export function LoginPage({ go }: { go: (p: Page) => void }) {
  useEffect(() => {
    window.location.href = EVENTSNAP_LOGIN_URL;
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
          Taking you to secure login…
        </p>
        <p className="text-muted-foreground text-sm mb-4">
          You're being redirected to your EventSnap Pro Dashboard login.
        </p>
        <a
          href={EVENTSNAP_LOGIN_URL}
          className="text-sm font-medium hover:underline"
          style={{ color: PURPLE }}
        >
          Click here if you're not redirected automatically
        </a>
      </div>
    </div>
  );
}
