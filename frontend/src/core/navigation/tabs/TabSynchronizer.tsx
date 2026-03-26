import { useAppDispatch } from "@store/storeHooks";
import { useParams, useRouterState } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";
import { useEffect } from "react";
import { TabRouteSearch, TabRouteState } from "../_types/TabData";
import { TabActions } from "../tabSlice";

function isRouteSearchCandidate(value: unknown): value is TabRouteSearch {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function TabSynchronizer() {
  const dispatch = useAppDispatch();

  const params = useParams({ strict: false }) as { projectId?: string | number };
  const { status, matches, location } = useRouterState({
    select: (state) => ({
      status: state.status,
      matches: state.matches,
      location: state.location,
    }),
  });

  useEffect(() => {
    // DEFENSE #1: If the router is navigating or pending, DO NOTHING.
    // Only run when the router has completely settled on a stable state.
    if (status !== "idle") {
      return;
    }

    // 1. Bail early if there's no valid projectId in the route parameters
    if (!params.projectId) return;

    const projectId = Number(params.projectId);
    if (!Number.isFinite(projectId)) return;

    // 2. Find the deepest matched route that is flagged as a tab
    // We spread into a new array to safely reverse it without mutating the original
    const matchedTabRoute = [...matches].reverse().find((match) => match.staticData?.tab);

    // Bail if none of the active routes are configured to be a tab
    if (!matchedTabRoute) return;

    // 3. Extract static data and invoke your getTitle function safely
    const staticData = matchedTabRoute.staticData ?? {};
    const label = staticData.getTitle?.(
      matchedTabRoute.loaderData,
      (matchedTabRoute.params ?? {}) as Record<string, unknown>,
    );

    // 4. Sync the tab data to your Redux store
    const route: TabRouteState = {
      to: location.pathname,
      ...(isRouteSearchCandidate(location.search) ? { search: location.search } : {}),
      ...(location.hash ? { hash: location.hash } : {}),
      ...(matchedTabRoute.params ? { params: matchedTabRoute.params as Record<string, unknown> } : {}),
    };

    dispatch(
      TabActions.addOrUpdateTab({
        projectId,
        tab: {
          id: location.pathname,
          route,
          label: label ?? "Project",
          icon: staticData.icon ?? Icon.PROJECT,
        },
      }),
    );
  }, [dispatch, location.hash, location.href, location.pathname, location.search, matches, params.projectId, status]);

  return null;
}
