import FilterDialog, { FilterDialogProps } from "../../../features/FilterDialog/FilterDialog";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { WordFrequencyFilterActions } from "./wordFrequencyFilterSlice";

function WordFrequencyFilterDialog({ anchorEl }: Pick<FilterDialogProps, "anchorEl">) {
  const filter = useAppSelector((state) => state.wordFrequencyFilter.filter["root"]);
  const editableFilter = useAppSelector((state) => state.wordFrequencyFilter.editableFilter);
  const column2Info = useAppSelector((state) => state.wordFrequencyFilter.column2Info);
  const expertMode = useAppSelector((state) => state.wordFrequencyFilter.expertMode);
  const dispatch = useAppDispatch();

  return (
    <FilterDialog
      anchorEl={anchorEl}
      filter={filter}
      editableFilter={editableFilter}
      filterActions={WordFrequencyFilterActions}
      column2Info={column2Info}
      expertMode={expertMode}
      onChangeExpertMode={(expertMode) => dispatch(WordFrequencyFilterActions.onChangeExpertMode({ expertMode }))}
    />
  );
}

export default WordFrequencyFilterDialog;
