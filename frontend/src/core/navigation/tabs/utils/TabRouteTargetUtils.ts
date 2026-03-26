import { TabRouteSearch, TabRouteState } from "../../_types/TabData";

const normalizeHash = (hash: string | undefined): string | undefined => {
  if (!hash) {
    return undefined;
  }

  return hash.startsWith("#") ? hash : `#${hash}`;
};

const normalizeSearch = (search: TabRouteSearch | undefined): TabRouteSearch | undefined => {
  if (!search) {
    return undefined;
  }

  const normalized: TabRouteSearch = {};

  for (const [key, value] of Object.entries(search)) {
    if (value === undefined) {
      continue;
    }

    if (Array.isArray(value)) {
      const filteredValues = value.filter((entry) => entry !== undefined);
      if (filteredValues.length > 0) {
        normalized[key] = filteredValues;
      }
      continue;
    }

    normalized[key] = value;
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

export function normalizeTabRoute(route: TabRouteState): TabRouteState {
  const to = route.to || "/";
  const search = normalizeSearch(route.search);
  const hash = normalizeHash(route.hash);

  return {
    to,
    ...(search ? { search } : {}),
    ...(hash ? { hash } : {}),
    ...(route.params ? { params: route.params } : {}),
  };
}

export function toTabNavigateArgs(route: Pick<TabRouteState, "to" | "search" | "hash">): {
  to: string;
  search?: TabRouteSearch;
  hash?: string;
} {
  const normalizedSearch = normalizeSearch(route.search);
  const normalizedHash = normalizeHash(route.hash);
  return {
    to: route.to || "/",
    ...(normalizedSearch ? { search: normalizedSearch } : {}),
    ...(normalizedHash ? { hash: normalizedHash } : {}),
  };
}
