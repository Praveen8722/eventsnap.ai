import PublicPortfolioView from "../PublicPortfolioView";

// Public shareable portfolio — eventsnap.ai/p/<slug>.
//
// The static GitHub Pages build (STATIC_EXPORT) can't render unknown slugs,
// so it only emits this placeholder; real /p/<slug> links there fall through
// to not-found.jsx, which forwards to /p?slug=<slug> (p/page.jsx).
export function generateStaticParams() {
  return [{ slug: "_" }];
}

export default async function PublicPortfolioPage({ params }) {
  const { slug } = await params;
  return <PublicPortfolioView slug={slug} />;
}
