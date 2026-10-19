import { useAppDispatch, useAppSelector, useReduxConnector } from "@store/storeHooks";
import { memo, useCallback, useMemo } from "react";
import { FilterDialog, InternalFilterDialogProps } from "./FilterDialog";

import { RootState } from "@store/store";
import { createEmptyFilter, MyFilter } from "../filterUtils";
import { TableInfoHooks } from "../api/tableInfoHooks";
import type { TableInfoOptions } from "../api/tableInfoQueries";
import { FilterActions, FilterState } from "../store";

export interface ReduxFilterDialogProps {
  filterName: string;
  filterStateSelector: (state: RootState) => FilterState;
  filterActions: FilterActions;
  // the query of the column infos of the table, e.g. memoQueries.tableInfo(projectId)
  tableInfoOptions: TableInfoOptions;
}

export const ReduxFilterDialog = memo(
  ({
    anchorEl,
    buttonProps,
    anchorOrigin,
    transformOrigin,
    filterStateSelector,
    filterName,
    filterActions,
    tableInfoOptions,
  }: ReduxFilterDialogProps &
    Pick<InternalFilterDialogProps, "anchorEl" | "buttonProps" | "transformOrigin" | "anchorOrigin">) => {
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
      <FilterDialog
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
