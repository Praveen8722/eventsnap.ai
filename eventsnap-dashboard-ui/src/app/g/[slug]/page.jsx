import SharedGalleryView from "../SharedGalleryView";

// Public shared client gallery — /g/<slug>.
//
// The static GitHub Pages build (STATIC_EXPORT) can't render unknown slugs,
// so it only emits this placeholder; real /g/<slug> links there fall through
// to not-found.jsx, which forwards to /g?slug=<slug> (g/page.jsx).
export function generateStaticParams() {
  return [{ slug: "_" }];
}

export default async function PublicGalleryPage({ params }) {
  const { slug } = await params;
  return <SharedGalleryView slug={slug} />;
}
