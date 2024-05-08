import FilterDialog, { FilterDialogProps } from "../../features/FilterDialog/FilterDialog.tsx";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { DocumentTableFilterProps } from "./DocumentTable.tsx";

function DocumentTableFilterDialog({
  anchorEl,
  buttonProps,
  ...filterProps
}: DocumentTableFilterProps & Pick<FilterDialogProps, "anchorEl" | "buttonProps">) {
  const { filterStateSelector, filterName, filterActions } = filterProps;
  const filter = useAppSelector((state) => filterStateSelector(state).filter[filterName]);
  const editableFilter = useAppSelector((state) => filterStateSelector(state).editableFilter);
  const column2Info = useAppSelector((state) => filterStateSelector(state).column2Info);
  const expertMode = useAppSelector((state) => filterStateSelector(state).expertMode);
  const dispatch = useAppDispatch();

  return (
    <FilterDialog
      anchorEl={anchorEl}
      filter={filter}
      filterName={filterName}
      editableFilter={editableFilter}
      filterActions={filterActions}
      column2Info={column2Info}
      expertMode={expertMode}
      onChangeExpertMode={(expertMode) => dispatch(filterActions.onChangeExpertMode({ expertMode }))}
      buttonProps={buttonProps}
    />
  );
}

export default DocumentTableFilterDialog;
