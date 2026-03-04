import { RootState } from "@store/store";
import { FilterActions, FilterState } from "../filterSlice";

export interface ReduxFilterDialogProps {
  filterName: string;
  filterStateSelector: (state: RootState) => FilterState;
  filterActions: FilterActions;
}
