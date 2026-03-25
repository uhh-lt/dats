import { useURLConnector } from "@hooks/useURLConnector";
import type { RouteApi } from "@tanstack/react-router";
import type { AnyRouter, RouteTypesById } from "@tanstack/router-core";
import type { SetStateAction } from "react";
import { useCallback, useMemo } from "react";
import type { MyFilter } from "../filterUtils";
import { deserializeFilterFromSearchParam, serializeFilterToSearchParam } from "./filterURLStore";

function isFunctionUpdater<T>(value: SetStateAction<T>): value is (prevState: T) => T {
  return typeof value === "function";
}

export const useFilterURLConnector = <
  TId extends string,
  TRouter extends AnyRouter,
  TKey extends keyof RouteTypesById<TRouter, TId>["fullSearchSchema"] & string,
  TFilter extends string = string,
>(
  routeAPI: RouteApi<TId, TRouter>,
  filterName: string,
  filterKey: TKey,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _filterColumnsEnum?: Record<string, TFilter>,
): [MyFilter<TFilter>, (updater: SetStateAction<MyFilter<TFilter>>) => void] => {
  const [serializedFilter, setSerializedFilter] = useURLConnector(routeAPI, filterKey);
  const filter = useMemo(
    () => deserializeFilterFromSearchParam<TFilter>(serializedFilter, filterName),
    [filterName, serializedFilter],
  );

  const setFilter = useCallback(
    (updater: SetStateAction<MyFilter<TFilter>>) => {
      setSerializedFilter((previousSerializedFilter) => {
        const previousFilter = deserializeFilterFromSearchParam<TFilter>(previousSerializedFilter, filterName);
        const nextFilter = isFunctionUpdater(updater) ? updater(previousFilter) : updater;
        return serializeFilterToSearchParam(nextFilter);
      });
    },
    [filterName, setSerializedFilter],
  );

  return [filter, setFilter];
};
