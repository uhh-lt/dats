import { featureQueries, getRouteFeature, useIsFeatureEnabled } from "@core/feature";
import { FeatureRead } from "@models/FeatureRead";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "@components/icons";
import { AnyRoute, AnyRouter, useMatches, useRouter } from "@tanstack/react-router";
import { useMemo } from "react";
import { NAVIGATION_ENTRIES } from "./navigationEntries";
import { NavigationEntry, NavigationGroup, NavigationRoute, ResolvedNavigationEntry } from "./navigationTypes";

/** The page route at `to`: the one that declares `staticData.tab` (the layout route of a path declares none). */
function findPageRoute(router: AnyRouter, to: NavigationRoute): AnyRoute | undefined {
  return Object.values(router.looseRoutesById).find((route) => route.to === to && route.options.staticData?.tab);
}

/**
 * An entry with the feature and the icon of its route; the page of a feature takes its title and description from
 * the backend list of the features (`featureQueries.list()`), with the feature's name as fallback. The lint rule `local/navigation-entries` rejects an entry whose route or title does not fit; should one
 * slip through, it is logged and shown with what is known instead of failing every page.
 */
function resolveNavigationEntry(
  router: AnyRouter,
  entry: NavigationEntry,
  features: readonly FeatureRead[] | undefined,
): ResolvedNavigationEntry {
  const route = findPageRoute(router, entry.to);
  if (!route) {
    console.error(`Navigation entry '${entry.id}': no page route declares \`staticData.tab\` for '${entry.to}'.`);
  }
  const icon = route?.options.staticData?.icon ?? Icon.PROJECT;
  const feature = route ? getRouteFeature(route) : undefined;
  if (feature === undefined) {
    if (entry.title === undefined) console.error(`Navigation entry '${entry.id}' needs a title.`);
    return { ...entry, feature, icon, title: entry.title ?? entry.id };
  }
  if (entry.title !== undefined || entry.description !== undefined) {
    console.error(`Navigation entry '${entry.id}' takes its title and description from the feature '${feature}'.`);
  }
  const info = features?.find((f) => f.feature === feature);
  return {
    ...entry,
    feature,
    icon,
    title: entry.title ?? info?.title ?? feature,
    description: entry.description ?? info?.description,
  };
}

/** Every navigation entry with the feature of its page, also the entries of disabled features. */
export function useNavigationEntries(): readonly ResolvedNavigationEntry[] {
  const router = useRouter();
  const { data: features } = useQuery(featureQueries.list());
  return useMemo(
    () => NAVIGATION_ENTRIES.map((entry: NavigationEntry) => resolveNavigationEntry(router, entry, features)),
    [router, features],
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
