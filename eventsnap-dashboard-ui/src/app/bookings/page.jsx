"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookings } from "./Bookings";
import { isLoggedIn } from "@/lib/session";

export default function BookingsPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // localStorage only exists client-side, so this can't be computed during
    // render (would mismatch the server-rendered output) — it has to run
    // after mount.
    if (isLoggedIn()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAuthChecked(true);
    } else {
      router.replace("/login");
    }
  }, [router]);

  if (!authChecked) return null;
  return <Bookings />;
}
