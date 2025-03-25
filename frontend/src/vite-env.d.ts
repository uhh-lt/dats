/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_SERVER: string;
  readonly VITE_APP_CONTENT: string;
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_SSO_PROVIDER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
