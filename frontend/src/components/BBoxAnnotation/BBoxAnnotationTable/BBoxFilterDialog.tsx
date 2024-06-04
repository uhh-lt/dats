import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import FilterDialog, { FilterDialogProps } from "../../FilterDialog/FilterDialog.tsx";
import { BBoxFilterActions } from "./bboxFilterSlice.ts";

function BBoxFilterDialog({
  filterName,
  anchorEl,
  buttonProps,
}: { filterName: string } & Pick<FilterDialogProps, "anchorEl" | "buttonProps">) {
  const filter = useAppSelector((state) => state.bboxFilter.filter[filterName]);
  const editableFilter = useAppSelector((state) => state.bboxFilter.editableFilter);
  const column2Info = useAppSelector((state) => state.bboxFilter.column2Info);
  const expertMode = useAppSelector((state) => state.bboxFilter.expertMode);
  const dispatch = useAppDispatch();

  return (
    <FilterDialog
      anchorEl={anchorEl}
      filter={filter}
      filterName={filterName}
      editableFilter={editableFilter}
      filterActions={BBoxFilterActions}
      column2Info={column2Info}
      expertMode={expertMode}
      onChangeExpertMode={(expertMode) => dispatch(BBoxFilterActions.onChangeExpertMode({ expertMode }))}
      buttonProps={buttonProps}
    />
  );
}

export default BBoxFilterDialog;
