import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { memo, useCallback } from "react";
import { FilterDialog, FilterDialogProps } from "./_components/FilterDialog";
import { ReduxFilterDialogProps } from "./ReduxFilterDialogProps";

export const ReduxFilterDialog = memo(
  ({
    anchorEl,
    buttonProps,
    anchorOrigin,
    transformOrigin,
    ...filterProps
  }: ReduxFilterDialogProps &
    Pick<FilterDialogProps, "anchorEl" | "buttonProps" | "transformOrigin" | "anchorOrigin">) => {
    const { filterStateSelector, filterName, filterActions } = filterProps;
    const filter = useAppSelector((state) => filterStateSelector(state).filter[filterName]);
    const editableFilter = useAppSelector((state) => filterStateSelector(state).editableFilter);
    const column2Info = useAppSelector((state) => filterStateSelector(state).column2Info);
    const expertMode = useAppSelector((state) => filterStateSelector(state).expertMode);
    const dispatch = useAppDispatch();

    const handleExpertModeChange = useCallback(
      (expertMode: boolean) => {
        dispatch(filterActions.onChangeFilterExpertMode({ expertMode }));
      },
      [dispatch, filterActions],
    );

    const handleStartFilterEdit = useCallback(
      (nextFilterName: string) => {
        dispatch(filterActions.onStartFilterEdit({ filterId: nextFilterName }));
      },
      [dispatch, filterActions],
    );

    const handleFinishFilterEdit = useCallback(() => {
      dispatch(filterActions.onFinishFilterEdit());
    }, [dispatch, filterActions]);

    const handleResetEditFilter = useCallback(() => {
      dispatch(filterActions.resetEditFilter());
    }, [dispatch, filterActions]);

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

    const handleChangeFilterLogicalOperator = useCallback(
      (filterId: string, operator: Parameters<typeof filterActions.changeFilterLogicalOperator>[0]["operator"]) => {
        dispatch(filterActions.changeFilterLogicalOperator({ filterId, operator }));
      },
      [dispatch, filterActions],
    );

    const handleChangeFilterColumn = useCallback(
      (filterId: string, columnValue: string) => {
        dispatch(filterActions.changeFilterColumn({ filterId, columnValue }));
      },
      [dispatch, filterActions],
    );

    const handleChangeFilterOperator = useCallback(
      (filterId: string, operator: Parameters<typeof filterActions.changeFilterOperator>[0]["operator"]) => {
        dispatch(filterActions.changeFilterOperator({ filterId, operator }));
      },
      [dispatch, filterActions],
    );

    const handleChangeFilterValue = useCallback(
      (filterId: string, value: Parameters<typeof filterActions.changeFilterValue>[0]["value"]) => {
        dispatch(filterActions.changeFilterValue({ filterId, value }));
      },
      [dispatch, filterActions],
    );

    return (
      <FilterDialog
        anchorEl={anchorEl}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        filter={filter}
        filterName={filterName}
        editableFilter={editableFilter}
        column2Info={column2Info}
        expertMode={expertMode}
        onStartFilterEdit={handleStartFilterEdit}
        onFinishFilterEdit={handleFinishFilterEdit}
        onResetEditFilter={handleResetEditFilter}
        onAddFilter={handleAddFilter}
        onAddFilterExpression={handleAddFilterExpression}
        onDeleteFilter={handleDeleteFilter}
        onChangeFilterLogicalOperator={handleChangeFilterLogicalOperator}
        onChangeFilterColumn={handleChangeFilterColumn}
        onChangeFilterOperator={handleChangeFilterOperator}
        onChangeFilterValue={handleChangeFilterValue}
        onChangeExpertMode={handleExpertModeChange}
        buttonProps={buttonProps}
      />
    );
  },
);
