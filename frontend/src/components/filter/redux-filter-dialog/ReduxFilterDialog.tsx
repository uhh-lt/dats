import { useAppDispatch, useAppSelector } from "@plugins/redux";
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

    return (
      <FilterDialog
        anchorEl={anchorEl}
        anchorOrigin={anchorOrigin}
        transformOrigin={transformOrigin}
        filter={filter}
        filterName={filterName}
        editableFilter={editableFilter}
        filterActions={filterActions}
        column2Info={column2Info}
        expertMode={expertMode}
        onChangeExpertMode={handleExpertModeChange}
        buttonProps={buttonProps}
      />
    );
  },
);
