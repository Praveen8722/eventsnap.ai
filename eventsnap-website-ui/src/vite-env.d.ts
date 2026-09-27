/// <reference types="vite/client" />

interface ImportMetaEnv {
  // Where the EventSnap dashboard (eventsnap-dashboard-ui) is hosted. Set by
  // .github/workflows/pages-cd.yaml for GitHub Pages; unset locally.
  readonly VITE_DASHBOARD_URL?: string;
  // Where eventsnap-website-backend is hosted (Contact form). Unset locally.
  readonly VITE_WEBSITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
