import * as Sentry from "@sentry/react";
import GeneralHooks from "../api/GeneralHooks.ts";

// Component that initializes Sentry after fetching instance info
export const SentryProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: instanceInfo, isError, error } = GeneralHooks.useGetInstanceInfo();

  if (isError) {
    console.error("Failed to fetch instance info for Sentry initialization:", error);
    return <>{children}</>;
  }

  if (!instanceInfo) {
    // Data is still loading, show nothing or loading spinner
    return null;
  }

  const { glitchtip_public_key: publicKey, glitchtip_project_id: projectId } = instanceInfo;

  if (!instanceInfo.glitchtip_public_key || !instanceInfo.glitchtip_project_id) {
    console.warn("Glitchtip configuration not available. Sentry tracking is disabled.");
    return <>{children}</>;
  }

  Sentry.init({
    dsn: `http://${publicKey}@dummy:12345/${projectId}`,
    tunnel: `/sentry-api/api/${projectId}/envelope/?sentry_key=${publicKey}`,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 1.0,
  });
  console.log("Sentry initialized with Glitchtip configuration");

  return <>{children}</>;
};
