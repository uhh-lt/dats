import { useURLConnector } from "@hooks/useURLConnector";
import { RootState } from "@store/store";
import { useAppSelector } from "@store/storeHooks";
import type { RouteApi } from "@tanstack/react-router";
import type { AnyRouter, RouteTypesById } from "@tanstack/router-core";
import { memo } from "react";
import { ColumnInfo, MyFilter, MyFilterExpression } from "../filterUtils";
import { FILTER_EXPERT_MODE_PARAM, FILTER_PARAM } from "../store";
import { FilterDialog, InternalFilterDialogProps } from "./FilterDialog";

// This ensures that the routeAPI passed to URLFilterDialog has the required search params for filter (FILTER_PARAM) and expert mode (FILTER_EXPERT_MODE_PARAM)
type RouteApiWithFilterSearchParams<TId extends string, TRouter extends AnyRouter> = RouteApi<TId, TRouter> &
  (RouteTypesById<TRouter, TId>["fullSearchSchema"] extends Record<typeof FILTER_PARAM, MyFilter | string | undefined> &
    Record<typeof FILTER_EXPERT_MODE_PARAM, boolean | undefined>
    ? unknown
    : never);

export interface URLFilterDialogProps<
  TId extends string = string,
  TRouter extends AnyRouter = AnyRouter,
  TFilter extends string = string,
> {
  routeApi: RouteApiWithFilterSearchParams<TId, TRouter>;
  filterColumnsEnum?: Record<string, TFilter>;
  defaultFilterExpression: MyFilterExpression<TFilter>;
  column2InfoSelector: (state: RootState) => Record<string, ColumnInfo>;
}

const URLFilterDialogComponent = <TId extends string, TRouter extends AnyRouter, TFilter extends string = string>({
  routeApi,
  defaultFilterExpression,
  column2InfoSelector,
  //
  anchorEl,
  buttonProps,
  anchorOrigin,
  transformOrigin,
}: URLFilterDialogProps<TId, TRouter, TFilter> &
  Pick<InternalFilterDialogProps, "anchorEl" | "buttonProps" | "transformOrigin" | "anchorOrigin">) => {
  const column2Info = useAppSelector(column2InfoSelector);

  const [expertMode, setExpertMode] = useURLConnector(routeApi, FILTER_EXPERT_MODE_PARAM);
  const [filter, setFilter] = useURLConnector(routeApi, FILTER_PARAM);

  return (
    <FilterDialog
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

export const URLFilterDialog = memo(URLFilterDialogComponent) as typeof URLFilterDialogComponent;
