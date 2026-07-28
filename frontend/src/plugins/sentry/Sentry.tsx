/* eslint-disable boundaries/element-types */
// This needs access to the "@api" layer because it needs to fetch configuration from the backend
import { OpenAPI } from "@api/core/OpenAPI";
import { GeneralHooks } from "@api/hooks/GeneralHooks";
import * as Sentry from "@sentry/react";

/**
 * This component is responsible for initializing Sentry with the Glitchtip configuration fetched from the backend.
 */
export const SentryProvider = ({ children }: { children: React.ReactNode }) => {
  const { data: instanceInfo, isError, error } = GeneralHooks.useGetInstanceInfo();

  if (isError) {
    console.error("Failed to fetch instance info for Sentry initialization:", error);
    return <>{children}</>;
  }

  if (!instanceInfo) {
    return null;
  }

  if (!instanceInfo.glitchtip_dsn) {
    console.warn("Glitchtip configuration not available. Sentry tracking is disabled.");
    return <>{children}</>;
  }

  Sentry.init({
    dsn: instanceInfo.glitchtip_dsn,
    environment: import.meta.env.MODE,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: import.meta.env.MODE === "development" ? 1.0 : 0.01,
    release: OpenAPI.VERSION,
  });
  console.log("Sentry initialized with Glitchtip configuration");

  return <>{children}</>;
};
