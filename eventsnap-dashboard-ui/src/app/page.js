"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// The app root has no page of its own. AppShell has already sent signed-out
// visitors to /login by the time this renders, so forward to the dashboard.
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return null;
}
