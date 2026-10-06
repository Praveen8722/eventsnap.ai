import ShareEventView from "../ShareEventView";

// Public Create Event page — /share/<shareId> (the event's QR / share link).
//
// The static GitHub Pages build (STATIC_EXPORT) can't render unknown ids, so
// it only emits this placeholder; real /share/<id> links there fall through
// to not-found.jsx, which forwards to /share?slug=<id> (share/page.jsx).
export function generateStaticParams() {
  return [{ slug: "_" }];
}

export default async function ShareEventPage({ params }) {
  const { slug } = await params;
  return <ShareEventView shareId={slug} />;
}
