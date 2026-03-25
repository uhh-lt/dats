import { useURLConnector } from "@hooks/useURLConnector";
import { RootState } from "@store/store";
import { useAppSelector } from "@store/storeHooks";
import { AnyRouter, RouteApi } from "@tanstack/react-router";
import { memo, useCallback, useMemo } from "react";
import { ColumnInfo, MyFilter, MyFilterExpression } from "../filterUtils";
import {
  FILTER_EXPERT_MODE_PARAM,
  FILTER_PARAM,
  deserializeFilterFromSearchParam,
  serializeFilterToSearchParam,
} from "../store";
import { FilterDialog, InternalFilterDialogProps } from "./FilterDialog";

export interface URLFilterDialogProps {
  filterName: string;
  routeApi: RouteApi<string, AnyRouter>;
  defaultFilterExpression: MyFilterExpression;
  column2InfoSelector: (state: RootState) => Record<string, ColumnInfo>;
}

export const URLFilterDialog = memo(
  ({
    filterName,
    routeApi,
    defaultFilterExpression,
    column2InfoSelector,
    //
    anchorEl,
    buttonProps,
    anchorOrigin,
    transformOrigin,
  }: URLFilterDialogProps &
    Pick<InternalFilterDialogProps, "anchorEl" | "buttonProps" | "transformOrigin" | "anchorOrigin">) => {
    const column2Info = useAppSelector(column2InfoSelector);

    const [expertMode, setExpertMode] = useURLConnector(routeApi, FILTER_EXPERT_MODE_PARAM);

    const [serializedFilter, setSerializedFilter] = useURLConnector(routeApi, FILTER_PARAM);
    const filter = useMemo(
      () => deserializeFilterFromSearchParam(serializedFilter, filterName),
      [filterName, serializedFilter],
    );
    const setFilter = useCallback(
      (nextFilter: MyFilter) => {
        setSerializedFilter(serializeFilterToSearchParam(nextFilter));
      },
      [setSerializedFilter],
    );

    return (
      <FilterDialog
        anchorEl={anchorEl}
        buttonProps={buttonProps}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        filterName={filterName}
        defaultFilterExpression={defaultFilterExpression}
        filter={filter}
        onFilterChange={setFilter}
        expertMode={expertMode}
        onExpertModeChange={setExpertMode}
        column2Info={column2Info}
      />
    );
  },
);
