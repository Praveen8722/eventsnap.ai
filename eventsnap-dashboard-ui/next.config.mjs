/** @type {import('next').NextConfig} */

// STATIC_EXPORT=true builds a static site for GitHub Pages
// (.github/workflows/pages-cd.yaml), served under NEXT_PUBLIC_BASE_PATH
// (e.g. /eventsnap.ai/app). Local dev and `next build` are unaffected.
const staticExport = process.env.STATIC_EXPORT === "true";

const nextConfig = {
  reactCompiler: true,
  ...(staticExport && {
    output: "export",
    // login/index.html etc., which GitHub Pages serves for /login and /login/.
    trailingSlash: true,
    basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
    images: { unoptimized: true },
  }),
};

export default nextConfig;
