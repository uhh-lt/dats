import { RootState } from "@store/store";
import { useAppDispatch, useAppSelector, useReduxConnector } from "@store/storeHooks";
import { memo, useCallback, useMemo } from "react";
import { TableInfoHooks } from "../api/tableInfoHooks";
import type { TableInfoOptions } from "../api/tableInfoQueries";
import { createEmptyFilter, MyFilter } from "../filterUtils";
import { FilterActions, FilterState } from "../store";
import { FilterPopover, InternalFilterPopoverProps } from "./FilterPopover";

export interface ReduxFilterPopoverProps {
  filterName: string;
  filterStateSelector: (state: RootState) => FilterState;
  filterActions: FilterActions;
  // the query of the column infos of the table, e.g. memoQueries.tableInfo(projectId)
  tableInfoOptions: TableInfoOptions;
}

export const ReduxFilterPopover = memo(
  ({
    anchorEl,
    buttonProps,
    anchorOrigin,
    transformOrigin,
    filterStateSelector,
    filterName,
    filterActions,
    tableInfoOptions,
  }: ReduxFilterPopoverProps &
    Pick<InternalFilterPopoverProps, "anchorEl" | "buttonProps" | "transformOrigin" | "anchorOrigin">) => {
    const dispatch = useAppDispatch();

    const column2Info = TableInfoHooks.useColumnInfoMap(tableInfoOptions);
    const defaultFilterExpression = useAppSelector((state) => filterStateSelector(state).defaultFilterExpression);

    const [expertMode, setExpertMode] = useReduxConnector(
      (state) => filterStateSelector(state).expertMode,
      filterActions.onChangeFilterExpertMode,
    );

    const reduxFilter = useAppSelector((state) => filterStateSelector(state).filter[filterName]);
    const filter = useMemo(() => reduxFilter || createEmptyFilter(filterName), [reduxFilter, filterName]);
    const setFilter = useCallback(
      (nextFilter: MyFilter) => {
        dispatch(filterActions.onChangeFilter({ filterName, filter: nextFilter }));
      },
      [dispatch, filterActions, filterName],
    );

    return (
      <FilterPopover
        anchorEl={anchorEl}
        buttonProps={buttonProps}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        // filter props
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
