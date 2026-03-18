import { RootState } from "@store/store";
import { FilterActions, FilterState } from "../store";

export interface ReduxFilterDialogProps {
  filterName: string;
  filterStateSelector: (state: RootState) => FilterState;
  filterActions: FilterActions;
}
