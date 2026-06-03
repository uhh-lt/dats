import * as Sentry from "@sentry/react";

export const initSentry = () => {
  const publicKey = import.meta.env.VITE_APP_GLITCHTIP_PUBLIC_KEY;
  const projectId = import.meta.env.VITE_APP_GLITCHTIP_PROJECT_ID;
  if (!publicKey || !projectId) {
    console.warn(
      "VITE_APP_GLITCHTIP_PUBLIC_KEY or VITE_APP_GLITCHTIP_PROJECT_ID is not defined. Sentry tracking is disabled.",
    );
    return;
  }

  // Construct the exact path with the authentication key re-attached
  const tunnelPath = `/sentry-api/api/${projectId}/envelope/?sentry_key=${publicKey}`;

  Sentry.init({
    dsn: `http://${publicKey}@dummy:12345/${projectId}`,
    tunnel: tunnelPath,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 1.0,
  });
  console.log("Sentry initialized");
};
