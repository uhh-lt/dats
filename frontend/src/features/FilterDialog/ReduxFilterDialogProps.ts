import { RootState } from "../../store/store.ts";
import { FilterActions, FilterState } from "./filterSlice.ts";

export interface ReduxFilterDialogProps {
  filterName: string;
  filterStateSelector: (state: RootState) => FilterState;
  filterActions: FilterActions;
}
