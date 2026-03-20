import { LogicalOperator } from "@api/models/LogicalOperator";
import { useURLConnector } from "@hooks/useURLConnector";
import { RootState } from "@store/store";
import { useAppSelector } from "@store/storeHooks";
import { memo, useCallback, useMemo, useState } from "react";
import { ColumnInfo, FilterOperators, MyFilterExpression } from "../filterUtils";
import {
  FILTER_EXPERT_MODE_PARAM,
  FILTER_PARAM,
  addDefaultFilter,
  addDefaultFilterExpression,
  changeFilterColumn,
  changeFilterLogicalOperator,
  changeFilterOperator,
  changeFilterValue,
  deleteFilterItem,
  deserializeFilterFromSearchParam,
  resetFilter,
  serializeFilterToSearchParam,
  withDefaultFilterExpression,
} from "../store";
import { FilterDialog, FilterDialogProps } from "./_components/FilterDialog";

export interface URLFilterDialogProps {
  filterName: string;
  routeApi: any;
  defaultFilterExpression: MyFilterExpression;
  column2InfoSelector: (state: RootState) => Record<string, ColumnInfo>;
  filterSearchParam?: string;
  expertModeSearchParam?: string;
}

export const URLFilterDialog = memo(
  ({
    filterName,
    routeApi,
    defaultFilterExpression,
    column2InfoSelector,
    filterSearchParam = FILTER_PARAM,
    expertModeSearchParam = FILTER_EXPERT_MODE_PARAM,
    anchorEl,
    buttonProps,
    anchorOrigin,
    transformOrigin,
  }: URLFilterDialogProps &
    Pick<FilterDialogProps, "anchorEl" | "buttonProps" | "transformOrigin" | "anchorOrigin">) => {
    const column2Info = useAppSelector(column2InfoSelector);

    // filter state management
    const [serializedFilter, setSerializedFilter] = useURLConnector(routeApi, filterSearchParam);
    const filter = useMemo(
      () => deserializeFilterFromSearchParam(serializedFilter, filterName),
      [filterName, serializedFilter],
    );
    const [editableFilter, setEditableFilter] = useState(filter);

    // expert mode state management
    const [expertModeValue, setExpertModeValue] = useURLConnector(routeApi, expertModeSearchParam);
    const expertMode = expertModeValue === true || expertModeValue === "true";

    // filter actions
    const handleStartFilterEdit = useCallback(() => {
      setEditableFilter(withDefaultFilterExpression(filter, defaultFilterExpression));
    }, [defaultFilterExpression, filter]);

    const handleFinishFilterEdit = useCallback(() => {
      setSerializedFilter(serializeFilterToSearchParam(editableFilter));
    }, [editableFilter, setSerializedFilter]);

    const handleResetEditFilter = useCallback(() => {
      setEditableFilter((prev) => resetFilter(prev));
    }, []);

    const handleChangeExpertMode = useCallback(
      (nextExpertMode: boolean) => {
        setExpertModeValue(nextExpertMode);
      },
      [setExpertModeValue],
    );

    const handleAddFilter = useCallback((filterId: string) => {
      setEditableFilter((prev) => addDefaultFilter(prev, filterId));
    }, []);

    const handleAddFilterExpression = useCallback(
      (filterId: string) => {
        setEditableFilter((prev) => addDefaultFilterExpression(prev, filterId, defaultFilterExpression));
      },
      [defaultFilterExpression],
    );

    const handleDeleteFilter = useCallback((filterId: string) => {
      setEditableFilter((prev) => deleteFilterItem(prev, filterId));
    }, []);

    const handleChangeFilterLogicalOperator = useCallback((filterId: string, operator: LogicalOperator) => {
      setEditableFilter((prev) => changeFilterLogicalOperator(prev, filterId, operator));
    }, []);

    const handleChangeFilterColumn = useCallback(
      (filterId: string, columnValue: string) => {
        setEditableFilter((prev) => changeFilterColumn(prev, filterId, columnValue, column2Info));
      },
      [column2Info],
    );

    const handleChangeFilterOperator = useCallback((filterId: string, operator: FilterOperators) => {
      setEditableFilter((prev) => changeFilterOperator(prev, filterId, operator));
    }, []);

    const handleChangeFilterValue = useCallback((filterId: string, value: string | number | boolean | string[]) => {
      setEditableFilter((prev) => changeFilterValue(prev, filterId, value));
    }, []);

    return (
      <FilterDialog
        anchorEl={anchorEl}
        buttonProps={buttonProps}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        filter={filter}
        filterName={filterName}
        editableFilter={editableFilter}
        expertMode={expertMode}
        column2Info={column2Info}
        onStartFilterEdit={handleStartFilterEdit}
        onFinishFilterEdit={handleFinishFilterEdit}
        onResetEditFilter={handleResetEditFilter}
        onChangeExpertMode={handleChangeExpertMode}
        onAddFilter={handleAddFilter}
        onAddFilterExpression={handleAddFilterExpression}
        onDeleteFilter={handleDeleteFilter}
        onChangeFilterLogicalOperator={handleChangeFilterLogicalOperator}
        onChangeFilterColumn={handleChangeFilterColumn}
        onChangeFilterOperator={handleChangeFilterOperator}
        onChangeFilterValue={handleChangeFilterValue}
      />
    );
  },
);
