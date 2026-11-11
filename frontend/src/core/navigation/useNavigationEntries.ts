import { useIsFeatureEnabled } from "@core/feature";
import { Feature } from "@models/Feature";
import { AnyRouter, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { NAVIGATION_ENTRIES } from "./navigationEntries";
import { NavigationGroup, NavigationRoute, ResolvedNavigationEntry } from "./navigationTypes";

/** The feature that the page at `to` declares on its route (`staticData.feature`). */
function getRouteFeature(router: AnyRouter, to: NavigationRoute): Feature | undefined {
  for (const route of Object.values(router.looseRoutesById)) {
    const feature = route.options.staticData?.feature;
    if (route.to === to && feature !== undefined) return feature;
  }
  return undefined;
}

/** Every navigation entry with the feature of its page, also the entries of disabled features. */
export function useNavigationEntries(): readonly ResolvedNavigationEntry[] {
  const router = useRouter();
  return useMemo(
    () => NAVIGATION_ENTRIES.map((entry) => ({ ...entry, feature: getRouteFeature(router, entry.to) })),
    [router],
  );
}

/** The navigation entries whose feature is enabled in the current project, optionally of one group only. */
export function useEnabledNavigationEntries(group?: NavigationGroup): readonly ResolvedNavigationEntry[] {
  const entries = useNavigationEntries();
  const isFeatureEnabled = useIsFeatureEnabled();
  return useMemo(
    () => entries.filter((entry) => (group === undefined || entry.group === group) && isFeatureEnabled(entry.feature)),
    [entries, group, isFeatureEnabled],
  );
}
