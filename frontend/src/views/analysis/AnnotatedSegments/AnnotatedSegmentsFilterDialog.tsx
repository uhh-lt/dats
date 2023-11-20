import FilterDialog, { FilterDialogProps } from "../../../features/FilterDialog/FilterDialog";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { AnnotatedSegmentsFilterActions } from "./annotatedSegmentsFilterSlice";

function AnnotatedSegmentsFilterDialog({ anchorEl }: Pick<FilterDialogProps, "anchorEl">) {
  const filter = useAppSelector((state) => state.annotatedSegmentsFilter.filter["root"]);
  const editableFilter = useAppSelector((state) => state.annotatedSegmentsFilter.editableFilter);
  const column2Info = useAppSelector((state) => state.annotatedSegmentsFilter.column2Info);
  const expertMode = useAppSelector((state) => state.annotatedSegmentsFilter.expertMode);
  const dispatch = useAppDispatch();

  return (
    <FilterDialog
      anchorEl={anchorEl}
      filter={filter}
      editableFilter={editableFilter}
      filterActions={AnnotatedSegmentsFilterActions}
      column2Info={column2Info}
      expertMode={expertMode}
      onChangeExpertMode={(expertMode) => dispatch(AnnotatedSegmentsFilterActions.onChangeExpertMode({ expertMode }))}
    />
  );
}

export default AnnotatedSegmentsFilterDialog;
