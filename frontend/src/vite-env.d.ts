/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_SERVER: string;
  readonly VITE_APP_CONTENT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
