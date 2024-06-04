import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import FilterDialog, { FilterDialogProps } from "../../FilterDialog/FilterDialog.tsx";
import { SATFilterActions } from "./satFilterSlice.ts";

function SATFilterDialog({
  filterName,
  anchorEl,
  buttonProps,
}: { filterName: string } & Pick<FilterDialogProps, "anchorEl" | "buttonProps">) {
  const filter = useAppSelector((state) => state.satFilter.filter[filterName]);
  const editableFilter = useAppSelector((state) => state.satFilter.editableFilter);
  const column2Info = useAppSelector((state) => state.satFilter.column2Info);
  const expertMode = useAppSelector((state) => state.satFilter.expertMode);
  const dispatch = useAppDispatch();

  return (
    <FilterDialog
      anchorEl={anchorEl}
      filter={filter}
      filterName={filterName}
      editableFilter={editableFilter}
      filterActions={SATFilterActions}
      column2Info={column2Info}
      expertMode={expertMode}
      onChangeExpertMode={(expertMode) => dispatch(SATFilterActions.onChangeExpertMode({ expertMode }))}
      buttonProps={buttonProps}
    />
  );
}

export default SATFilterDialog;
