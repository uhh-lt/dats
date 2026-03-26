import { toTabNavigateArgs } from "@core/navigation";
import { RootState } from "@store/store";
import { useAppSelector } from "@store/storeHooks";
import { useRouter } from "@tanstack/react-router";
import type { MouseEvent as ReactMouseEvent } from "react";
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
  target?: string;
  onClick?: (event: ReactMouseEvent<HTMLAnchorElement>) => void;
};

function isModifiedEvent(event: ReactMouseEvent<HTMLAnchorElement>): boolean {
  return event.metaKey || event.altKey || event.ctrlKey || event.shiftKey;
}

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
      targetLocation = router.buildLocation(props as Parameters<typeof router.buildLocation>[0]);
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

    return {
      ...props,
      onClick: (event: ReactMouseEvent<HTMLAnchorElement>) => {
        props.onClick?.(event);

        if (event.defaultPrevented) {
          return;
        }

        if (props.target && props.target !== "_self") {
          return;
        }

        if (event.button !== 0 || isModifiedEvent(event)) {
          return;
        }

        event.preventDefault();
        void router.navigate(toTabNavigateArgs(existingTab.route) as Parameters<typeof router.navigate>[0]);
      },
    } as T;
  }, [props, router, tabsByProject]);
}
