import type { RouteApi } from "@tanstack/react-router";
import type { AnyRouter, RouteTypesById } from "@tanstack/router-core";
import type { SetStateAction } from "react";
import { useCallback } from "react";

function isFunctionUpdater<T>(value: SetStateAction<T>): value is (prevState: T) => T {
  return typeof value === "function";
}

export function useURLConnector<
  TId extends string,
  TRouter extends AnyRouter,
  TKey extends keyof RouteTypesById<TRouter, TId>["fullSearchSchema"] & string,
>(
  routeApi: RouteApi<TId, TRouter>,
  key: TKey,
): [
  RouteTypesById<TRouter, TId>["fullSearchSchema"][TKey],
  (updater: SetStateAction<RouteTypesById<TRouter, TId>["fullSearchSchema"][TKey]>) => void,
] {
  type TSearch = RouteTypesById<TRouter, TId>["fullSearchSchema"];
  type TValue = TSearch[TKey];

  const searchState = routeApi.useSearch() as TSearch;
  const navigate = routeApi.useNavigate();

  const onStateChange = useCallback(
    (updater: SetStateAction<TValue>) => {
      navigate({
        search: (prev: TSearch) => {
          const previousValue = prev[key] as TValue;

          // 2. Use the type guard! No messy 'as Function' casts needed here.
          const nextValue = isFunctionUpdater(updater) ? updater(previousValue) : updater;

          return {
            ...prev,
            [key]: nextValue,
          };
        },
        replace: true,
      });
    },
    [key, navigate],
  );

  return [searchState[key], onStateChange];
}
