import { useAppDispatch } from "@store/storeHooks";
import { useMatches, useParams, useRouterState } from "@tanstack/react-router";
import { Icon } from "@utils/icons/iconUtils";
import { useEffect } from "react";
import { TabActions } from "../tabSlice";

interface TabStaticData {
  tab?: boolean;
  icon?: Icon;
  getTitle?: (loaderData?: unknown, params?: Record<string, unknown>) => string;
}

function isProjectPath(pathname: string): boolean {
  return /^\/project\/\d+(?:\/|$)/.test(pathname);
}

export function TabSynchronizer() {
  const dispatch = useAppDispatch();
  const location = useRouterState({ select: (state) => state.location });
  const params = useParams({ strict: false }) as { projectId?: string | number };
  const matches = useMatches();

  useEffect(() => {
    if (!isProjectPath(location.pathname)) {
      return;
    }

    if (!params.projectId) {
      return;
    }

    const projectId = Number(params.projectId);
    if (!Number.isFinite(projectId)) {
      return;
    }

    const matchedTabRoute = [...matches].reverse().find((match) => {
      const staticData = (match.staticData ?? {}) as TabStaticData;
      return staticData.tab;
    });

    if (!matchedTabRoute) {
      return;
    }

    const staticData = (matchedTabRoute.staticData ?? {}) as TabStaticData;
    const label = staticData.getTitle?.(
      matchedTabRoute.loaderData,
      (matchedTabRoute.params ?? {}) as Record<string, unknown>,
    );

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
