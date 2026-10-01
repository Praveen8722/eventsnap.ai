"use client";

import NextLink from "next/link";

// App-wide <Link> that defaults prefetch OFF.
//
// On the static GitHub Pages export, Next's route prefetch fetches the target
// page document with a Range request, which GitHub Pages answers with
// "206 Partial Content". The browser caches that partial response and then, on
// a later real (hard) navigation to the same route, revalidates and gets a
// "304 Not Modified" — reusing the partial entry and rendering a blank page.
// Prefetching gives no benefit here anyway (page data is fetched at runtime
// from the API), so it is disabled. Every other <Link> behaviour is unchanged,
// and callers can still opt back in per-link with `prefetch`.
export default function AppLink({ prefetch = false, ...props }) {
  return <NextLink prefetch={prefetch} {...props} />;
}
