import { LogicalOperator } from "@api/models/LogicalOperator";
import { useAppSelector } from "@store/storeHooks";
import { memo, useCallback, useMemo, useState } from "react";
import { FilterOperators } from "../filterUtils";
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
import { FilterDialog } from "./_components/FilterDialog";
import { URLFilterDialogProps, URLFilterDialogViewProps } from "./URLFilterDialogProps";

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
  }: URLFilterDialogProps & URLFilterDialogViewProps) => {
    const search = routeApi.useSearch() as Record<string, unknown>;
    const navigate = routeApi.useNavigate() as (options: {
      search: (prev: Record<string, unknown>) => Record<string, unknown>;
      replace?: boolean;
    }) => unknown;
    const column2Info = useAppSelector(column2InfoSelector);

    const filter = useMemo(
      () => deserializeFilterFromSearchParam(search[filterSearchParam], filterName),
      [filterName, filterSearchParam, search],
    );

    const expertMode = search[expertModeSearchParam] === true || search[expertModeSearchParam] === "true";

    const [editableFilter, setEditableFilter] = useState(filter);

    const handleStartFilterEdit = useCallback(() => {
      setEditableFilter(withDefaultFilterExpression(filter, defaultFilterExpression));
    }, [defaultFilterExpression, filter]);

    const handleFinishFilterEdit = useCallback(() => {
      navigate({
        search: (prev) => ({
          ...prev,
          [filterSearchParam]: serializeFilterToSearchParam(editableFilter),
        }),
        replace: true,
      });
    }, [editableFilter, filterSearchParam, navigate]);

    const handleResetEditFilter = useCallback(() => {
      setEditableFilter((prev) => resetFilter(prev));
    }, []);

    const handleChangeExpertMode = useCallback(
      (nextExpertMode: boolean) => {
        navigate({
          search: (prev) => ({
            ...prev,
            [expertModeSearchParam]: nextExpertMode,
          }),
          replace: true,
        });
      },
      [expertModeSearchParam, navigate],
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
