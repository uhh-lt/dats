import { FEATURES, useIsFeatureEnabled } from "@core/feature";
import { Icon } from "@components/icons";
import { AnyRouter, StaticDataRouteOption, useMatches, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { NAVIGATION_ENTRIES } from "./navigationEntries";
import { NavigationEntry, NavigationGroup, NavigationRoute, ResolvedNavigationEntry } from "./navigationTypes";

/** The static data that the page at `to` declares on its route (the layout route of a path declares none). */
function getRouteStaticData(router: AnyRouter, to: NavigationRoute): StaticDataRouteOption {
  for (const route of Object.values(router.looseRoutesById)) {
    const staticData = route.options.staticData;
    if (route.to === to && staticData?.tab) return staticData;
  }
  throw new Error(`No page route declares \`staticData.tab\` for '${to}'.`);
}

/**
 * An entry with the feature and the icon of its route; the page of a feature takes its title and description from
 * `FEATURES`. Throws for an entry that names a title although its route declares a feature, or none although it
 * declares none.
 */
function resolveNavigationEntry(router: AnyRouter, entry: NavigationEntry): ResolvedNavigationEntry {
  const { feature, icon = Icon.PROJECT } = getRouteStaticData(router, entry.to);
  if (feature === undefined) {
    if (entry.title === undefined) throw new Error(`Navigation entry '${entry.id}' needs a title.`);
    return { ...entry, feature, icon, title: entry.title };
  }
  if (entry.title !== undefined || entry.description !== undefined) {
    throw new Error(`Navigation entry '${entry.id}' takes its title and description from FEATURES['${feature}'].`);
  }
  return { ...entry, feature, icon, title: FEATURES[feature].title, description: FEATURES[feature].description };
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
