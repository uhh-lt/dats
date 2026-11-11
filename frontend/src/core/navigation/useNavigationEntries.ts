import { FEATURES, useIsFeatureEnabled } from "@core/feature";
import { Feature } from "@models/Feature";
import { AnyRouter, useMatches, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { NAVIGATION_ENTRIES } from "./navigationEntries";
import { NavigationEntry, NavigationGroup, NavigationRoute, ResolvedNavigationEntry } from "./navigationTypes";

/** The feature that the page at `to` declares on its route (`staticData.feature`). */
function getRouteFeature(router: AnyRouter, to: NavigationRoute): Feature | undefined {
  for (const route of Object.values(router.looseRoutesById)) {
    const feature = route.options.staticData?.feature;
    if (route.to === to && feature !== undefined) return feature;
  }
  return undefined;
}

/**
 * An entry with the feature of its route; the page of a feature takes its title and description from `FEATURES`.
 * Throws for an entry that names a title although its route declares a feature, or none although it declares none.
 */
function resolveNavigationEntry(router: AnyRouter, entry: NavigationEntry): ResolvedNavigationEntry {
  const feature = getRouteFeature(router, entry.to);
  if (feature === undefined) {
    if (entry.title === undefined) throw new Error(`Navigation entry '${entry.id}' needs a title.`);
    return { ...entry, feature, title: entry.title };
  }
  if (entry.title !== undefined || entry.description !== undefined) {
    throw new Error(`Navigation entry '${entry.id}' takes its title and description from FEATURES['${feature}'].`);
  }
  return { ...entry, feature, title: FEATURES[feature].title, description: FEATURES[feature].description };
}

/** Every navigation entry with the feature of its page, also the entries of disabled features. */
export function useNavigationEntries(): readonly ResolvedNavigationEntry[] {
  const router = useRouter();
  return useMemo(
    () => NAVIGATION_ENTRIES.map((entry: NavigationEntry) => resolveNavigationEntry(router, entry)),
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

/** The entry of the page with the route path `fullPath` (an index route's path ends with a slash). */
export function findNavigationEntry(
  entries: readonly ResolvedNavigationEntry[],
  fullPath: string,
): ResolvedNavigationEntry | undefined {
  const to = fullPath.replace(/\/$/, "");
  return entries.find((entry) => entry.to === to);
}

/** The title of the current page's navigation entry (also its tab title), for the heading of the page. */
export function useNavigationTitle(): string | undefined {
  const entries = useNavigationEntries();
  const fullPath = useMatches({ select: (matches) => matches[matches.length - 1]?.fullPath });
  return fullPath === undefined ? undefined : findNavigationEntry(entries, fullPath)?.title;
}
