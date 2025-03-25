/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_SERVER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
