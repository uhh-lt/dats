import { useAppDispatch } from "@store/storeHooks";
import { useMatches, useParams, useRouterState } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";
import { useEffect } from "react";
import { TabActions } from "../tabSlice";

export function TabSynchronizer() {
  const dispatch = useAppDispatch();
  const location = useRouterState({ select: (state) => state.location });

  const params = useParams({ strict: false }) as { projectId?: string | number };
  const matches = useMatches();

  useEffect(() => {
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
    dispatch(
      TabActions.addOrUpdateTab({
        projectId,
        tab: {
          id: location.pathname,
          href: location.href,
          label: label ?? "Project",
          icon: staticData.icon ?? Icon.PROJECT,
        },
      }),
    );
  }, [dispatch, location.href, location.pathname, matches, params.projectId]);

  return null;
}
