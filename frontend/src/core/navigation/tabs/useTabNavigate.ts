import { RootState } from "@store/store";
import { useAppSelector } from "@store/storeHooks";
import { RegisteredRouter, useNavigate, useParams, useRouter, ValidateNavigateOptions } from "@tanstack/react-router";
import { useCallback } from "react";
import { toTabNavigateArgs } from "./utils/TabRouteTargetUtils";

type StrictNavigateArgs<TOptions> = ValidateNavigateOptions<RegisteredRouter, TOptions>;

type RelaxedNavigateArgs<TOptions> =
  StrictNavigateArgs<TOptions> extends { search: infer TSearch }
    ? Omit<StrictNavigateArgs<TOptions>, "search"> & { search?: TSearch }
    : StrictNavigateArgs<TOptions>;

/**
 * Programmatic navigation helper for tabbed project routes.
 *
 * Use this hook instead of `useNavigate` when navigation should respect the tab history
 * stored in Redux (`tabSlice`). It keeps route typing from TanStack Router and applies
 * tab-aware restore semantics:
 *
 * - If navigating to a project route that already has an open tab and no explicit
 *   `search` is provided, it restores the tab's stored route state.
 * - If `search` is explicitly provided, it uses that navigation target directly.
 * - If navigation is outside a project context, it behaves like normal `useNavigate`.
 *
 * Prefer plain `useNavigate` for non-tab flows (auth redirects, dialogs, one-off
 * route-local state changes) where tab restoration is not desired.
 */
export const useTabNavigate = () => {
  const navigate = useNavigate();
  const router = useRouter();
  const routeParams = useParams({ strict: false }) as { projectId?: string | number };
  const tabsByProject = useAppSelector((state: RootState) => state.tabs.tabsByProject);

  const currentProjectId =
    routeParams.projectId !== undefined && routeParams.projectId !== null ? Number(routeParams.projectId) : null;

  return useCallback(
    <TOptions>(navigateArgs: RelaxedNavigateArgs<TOptions>) => {
      const strictNavigateArgs = navigateArgs as StrictNavigateArgs<TOptions>;
      type BuildLocationArgs = Parameters<typeof router.buildLocation>[0];

      const builtLocation = router.buildLocation(strictNavigateArgs as BuildLocationArgs);

      const paramsCandidate =
        navigateArgs && typeof navigateArgs === "object" && "params" in navigateArgs
          ? (navigateArgs.params as Record<string, unknown> | undefined)
          : undefined;
      const targetProjectIdRaw = paramsCandidate?.projectId;

      const targetProjectId =
        targetProjectIdRaw !== undefined && targetProjectIdRaw !== null ? Number(targetProjectIdRaw) : currentProjectId;

      if (!targetProjectId || !Number.isFinite(targetProjectId)) {
        navigate(strictNavigateArgs);
        return;
      }

      const existingTab = tabsByProject[targetProjectId]?.tabsById[builtLocation.pathname];
      const hasExplicitSearch =
        navigateArgs &&
        typeof navigateArgs === "object" &&
        "search" in navigateArgs &&
        (navigateArgs as { search?: unknown }).search !== undefined;

      if (existingTab && !hasExplicitSearch) {
        void router.navigate(toTabNavigateArgs(existingTab.route) as Parameters<typeof router.navigate>[0]);
        return;
      }

      navigate(strictNavigateArgs);
    },
    [currentProjectId, navigate, router, tabsByProject],
  );
};
