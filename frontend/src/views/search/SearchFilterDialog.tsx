import FilterDialog, { FilterDialogProps } from "../../features/FilterDialog/FilterDialog";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { SearchFilterActions } from "./searchFilterSlice";

function SearchFilterDialog({ anchorEl }: Pick<FilterDialogProps, "anchorEl">) {
  const filter = useAppSelector((state) => state.searchFilter.filter["root"]);
  const editableFilter = useAppSelector((state) => state.searchFilter.editableFilter);
  const column2Info = useAppSelector((state) => state.searchFilter.column2Info);
  const expertMode = useAppSelector((state) => state.searchFilter.expertMode);
  const dispatch = useAppDispatch();

  return (
    <FilterDialog
      anchorEl={anchorEl}
      filter={filter}
      editableFilter={editableFilter}
      filterActions={SearchFilterActions}
      column2Info={column2Info}
      expertMode={expertMode}
      onChangeExpertMode={(expertMode) => dispatch(SearchFilterActions.onChangeExpertMode({ expertMode }))}
    />
  );
}

export default SearchFilterDialog;
