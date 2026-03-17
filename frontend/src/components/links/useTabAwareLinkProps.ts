import { RootState } from "@store/store";
import { useAppSelector } from "@store/storeHooks";
import { useRouter } from "@tanstack/react-router";
import { useMemo } from "react";

function getProjectIdFromPathname(pathname: string): number | null {
  const matched = pathname.match(/\/project\/(\d+)/);
  if (!matched) {
    return null;
  }

  const projectId = Number(matched[1]);
  return Number.isFinite(projectId) ? projectId : null;
}

type TabAwareLinkInput = {
  to?: unknown;
  params?: unknown;
  search?: unknown;
  hash?: unknown;
  state?: unknown;
  mask?: unknown;
  from?: unknown;
  href?: string;
};

export function useTabAwareLinkProps<T extends TabAwareLinkInput>(props: T): T {
  const router = useRouter();
  const tabsByProject = useAppSelector((state: RootState) => state.tabs.tabsByProject);

  return useMemo(() => {
    if (props.to === undefined || props.to === null) {
      return props;
    }

    const hasExplicitSearch = props.search !== undefined;
    if (hasExplicitSearch) {
      return props;
    }

    let targetLocation: { pathname: string };
    try {
      targetLocation = router.buildLocation(props as never);
    } catch {
      return props;
    }

    const projectId = getProjectIdFromPathname(targetLocation.pathname);
    if (projectId === null) {
      return props;
    }

    const existingTab = tabsByProject[projectId]?.tabsById[targetLocation.pathname];
    if (!existingTab) {
      return props;
    }

    const {
      to: _to,
      params: _params,
      search: _search,
      hash: _hash,
      state: _state,
      mask: _mask,
      from: _from,
      ...rest
    } = props;

    return {
      ...(rest as Omit<T, "to" | "params" | "search" | "hash" | "state" | "mask" | "from">),
      href: existingTab.href,
    } as T;
  }, [props, router, tabsByProject]);
}
