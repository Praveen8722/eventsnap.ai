"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "@/components/common/layout/Sidebar";
import Navbar from "@/components/common/layout/Navbar";
import { isLoggedIn } from "@/lib/session";

// Routes that render on their own, without the app chrome (Sidebar + Navbar).
const AUTH_ROUTES = ["/login", "/signup", "/forgot-password"];

// Public portfolio / gallery viewers in their /p?slug= and /g?slug= form.
const BARE_ROUTES = ["/p", "/g"];

// Prefixes that also render bare (e.g. the public client gallery viewer).
const BARE_PREFIXES = ["/g/", "/p/"];

export default function AppShell({ children }) {
  const router = useRouter();
  // The GitHub Pages build uses trailing slashes (/login/); match either form.
  const pathname = usePathname()?.replace(/(.)\/$/, "$1");

  const isPublic =
    AUTH_ROUTES.includes(pathname) ||
    BARE_ROUTES.includes(pathname) ||
    BARE_PREFIXES.some((prefix) => pathname?.startsWith(prefix));

  // Every other route (dashboard and all app pages, including ones reached by
  // direct URL or a refresh) is gated here, before the Sidebar/Navbar mount
  // and start calling authenticated APIs. localStorage only exists
  // client-side, so the check runs after mount and nothing renders until it
  // passes.
  const [authed, setAuthed] = useState(false);

  // The static GitHub Pages export serves one 404.html for every unknown path
  // (every shared /p/<slug> and /g/<slug> link, handled by not-found.jsx). That
  // file is prerendered once as the "/_not-found" route, but hydrates under the
  // visited path — so this component's path-dependent output (public vs gated)
  // would differ between the server HTML and the first client render and throw
  // a hydration mismatch (React #418). Gating the first render on `mounted`
  // makes the server render and the first client render identical (null) for
  // every route; the real, path-dependent layout is chosen only after mount.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isPublic) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthed(false);
      return;
    }
    const check = () => {
      if (isLoggedIn()) {
        setAuthed(true);
      } else {
        setAuthed(false);
        router.replace("/login");
      }
    };
    check();
    // Re-check when the session changes in another tab (logout/login there),
    // when this tab's session is updated, and when the page is restored from
    // the browser's back/forward cache after a logout.
    const onPageShow = (e) => e.persisted && check();
    window.addEventListener("storage", check);
    window.addEventListener("eventsnap-user-updated", check);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.removeEventListener("storage", check);
      window.removeEventListener("eventsnap-user-updated", check);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [isPublic, pathname, router]);

  // Until mounted, the server render and the first client render match (null)
  // on every path, so the reused 404.html never hydrates into a mismatch.
  if (!mounted) return null;

  if (isPublic) {
    return <>{children}</>;
  }

  if (!authed) return null;

  return (
    <section className="flex">
      <Sidebar />

      <main className="min-w-0 flex-1 p-6">
        <Navbar />
        {children}
      </main>
    </section>
  );
}
