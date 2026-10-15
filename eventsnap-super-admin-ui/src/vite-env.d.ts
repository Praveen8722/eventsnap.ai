/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the admin API. Defaults to "/api" (proxied to the backend in dev). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
