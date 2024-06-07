import FilterDialog, { FilterDialogProps } from "../../../components/FilterDialog/FilterDialog.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { WordFrequencyActions } from "./wordFrequencySlice.ts";

function WordFrequencyFilterDialog({ anchorEl }: Pick<FilterDialogProps, "anchorEl">) {
  const filter = useAppSelector((state) => state.wordFrequency.filter["root"]);
  const editableFilter = useAppSelector((state) => state.wordFrequency.editableFilter);
  const column2Info = useAppSelector((state) => state.wordFrequency.column2Info);
  const expertMode = useAppSelector((state) => state.wordFrequency.expertMode);
  const dispatch = useAppDispatch();

  return (
    <FilterDialog
      anchorEl={anchorEl}
      filter={filter}
      editableFilter={editableFilter}
      filterActions={WordFrequencyActions}
      column2Info={column2Info}
      expertMode={expertMode}
      onChangeExpertMode={(expertMode) => dispatch(WordFrequencyActions.onChangeExpertMode({ expertMode }))}
    />
  );
}

export default WordFrequencyFilterDialog;
