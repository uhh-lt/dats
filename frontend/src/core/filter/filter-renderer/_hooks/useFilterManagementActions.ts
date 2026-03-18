import { LogicalOperator } from "@api/models/LogicalOperator";
import { useAppDispatch } from "@store/storeHooks";
import { useCallback } from "react";
import { FilterOperators } from "../../filterUtils";
import { FilterActions } from "../../store";

export const useFilterManagementActions = (filterActions: FilterActions) => {
  // global client state (redux)
  const dispatch = useAppDispatch();

  // actions
  const handleAddFilter = useCallback(
    (filterId: string) => {
      dispatch(filterActions.addDefaultFilter({ filterId }));
    },
    [dispatch, filterActions],
  );

  const handleAddFilterExpression = useCallback(
    (filterId: string) => {
      dispatch(filterActions.addDefaultFilterExpression({ filterId, addEnd: true }));
    },
    [dispatch, filterActions],
  );

  const handleDeleteFilter = useCallback(
    (filterId: string) => {
      dispatch(filterActions.deleteFilter({ filterId }));
    },
    [dispatch, filterActions],
  );

  const handleLogicalOperatorChange = useCallback(
    (filterId: string, operator: LogicalOperator) => {
      dispatch(filterActions.changeFilterLogicalOperator({ filterId, operator }));
    },
    [dispatch, filterActions],
  );

  const handleColumnChange = useCallback(
    (filterId: string, columnValue: string) => {
      dispatch(filterActions.changeFilterColumn({ filterId, columnValue }));
    },
    [dispatch, filterActions],
  );

  const handleOperatorChange = useCallback(
    (filterId: string, operator: FilterOperators) => {
      dispatch(filterActions.changeFilterOperator({ filterId, operator }));
    },
    [dispatch, filterActions],
  );

  const handleValueChange = useCallback(
    (filterId: string, value: string | number | boolean | string[]) => {
      dispatch(filterActions.changeFilterValue({ filterId, value }));
    },
    [dispatch, filterActions],
  );

  return {
    handleAddFilter,
    handleAddFilterExpression,
    handleDeleteFilter,
    handleLogicalOperatorChange,
    handleColumnChange,
    handleOperatorChange,
    handleValueChange,
  };
};
