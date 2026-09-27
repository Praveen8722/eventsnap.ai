"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/common/layout/Sidebar";
import Navbar from "@/components/common/layout/Navbar";

// Routes that render on their own, without the app chrome (Sidebar + Navbar).
const AUTH_ROUTES = ["/login", "/signup"];

// Public portfolio / gallery viewers in their /p?slug= and /g?slug= form.
const BARE_ROUTES = ["/p", "/g"];

// Prefixes that also render bare (e.g. the public client gallery viewer).
const BARE_PREFIXES = ["/g/", "/p/"];

export default function AppShell({ children }) {
  // The GitHub Pages build uses trailing slashes (/login/); match either form.
  const pathname = usePathname()?.replace(/(.)\/$/, "$1");

  if (
    AUTH_ROUTES.includes(pathname) ||
    BARE_ROUTES.includes(pathname) ||
    BARE_PREFIXES.some((prefix) => pathname?.startsWith(prefix))
  ) {
    return <>{children}</>;
  }

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
