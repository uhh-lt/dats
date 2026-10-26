import { useURLConnector } from "@hooks/useURLConnector";
import type { RouteApi } from "@tanstack/react-router";
import type { AnyRouter, RouteTypesById } from "@tanstack/router-core";
import { memo } from "react";
import { TableInfoHooks } from "../api/tableInfoHooks";
import type { TableInfoOptions } from "../api/tableInfoQueries";
import { MyFilter, MyFilterExpression } from "../filterUtils";
import { FILTER_EXPERT_MODE_PARAM, FILTER_PARAM } from "../store";
import { FilterPopover, InternalFilterPopoverProps } from "./FilterPopover";

// This ensures that the routeAPI passed to URLFilterPopover has the required search params for filter (FILTER_PARAM) and expert mode (FILTER_EXPERT_MODE_PARAM)
type RouteApiWithFilterSearchParams<TId extends string, TRouter extends AnyRouter> = RouteApi<TId, TRouter> &
  (RouteTypesById<TRouter, TId>["fullSearchSchema"] extends Record<typeof FILTER_PARAM, MyFilter | string | undefined> &
    Record<typeof FILTER_EXPERT_MODE_PARAM, boolean | undefined>
    ? unknown
    : never);

export interface URLFilterPopoverProps<
  TId extends string = string,
  TRouter extends AnyRouter = AnyRouter,
  TFilter extends string = string,
> {
  routeApi: RouteApiWithFilterSearchParams<TId, TRouter>;
  defaultFilterExpression: MyFilterExpression<TFilter>;
  // the query of the column infos of the table, e.g. memoQueries.tableInfo(projectId)
  tableInfoOptions: TableInfoOptions;
}

const URLFilterPopoverInner = <TId extends string, TRouter extends AnyRouter, TFilter extends string = string>({
  routeApi,
  defaultFilterExpression,
  tableInfoOptions,
  // ----
  anchorEl,
  buttonProps,
  anchorOrigin,
  transformOrigin,
}: URLFilterPopoverProps<TId, TRouter, TFilter> &
  Pick<InternalFilterPopoverProps, "anchorEl" | "buttonProps" | "transformOrigin" | "anchorOrigin">) => {
  const column2Info = TableInfoHooks.useColumnInfoMap(tableInfoOptions);

  const [expertMode, setExpertMode] = useURLConnector(routeApi, FILTER_EXPERT_MODE_PARAM);
  const [filter, setFilter] = useURLConnector(routeApi, FILTER_PARAM);

  return (
    <FilterPopover
      anchorEl={anchorEl}
      buttonProps={buttonProps}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      filterName={"root"}
      defaultFilterExpression={defaultFilterExpression}
      filter={filter}
      onFilterChange={setFilter}
      expertMode={expertMode}
      onExpertModeChange={setExpertMode}
      column2Info={column2Info}
    />
  );
};

export const URLFilterPopover = memo(URLFilterPopoverInner) as typeof URLFilterPopoverInner;
