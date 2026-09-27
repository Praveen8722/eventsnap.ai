"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/common/layout/Sidebar";
import Navbar from "@/components/common/layout/Navbar";

// Routes that render on their own, without the app chrome (Sidebar + Navbar).
const AUTH_ROUTES = ["/login", "/signup"];

// Prefixes that also render bare (e.g. the public client gallery viewer).
const BARE_PREFIXES = ["/g/", "/p/"];

export default function AppShell({ children }) {
  const pathname = usePathname();

  if (
    AUTH_ROUTES.includes(pathname) ||
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
