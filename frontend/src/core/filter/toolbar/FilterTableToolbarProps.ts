import { MRT_TableInstance } from "material-react-table";
import { TableRowWithId } from "../_types/TableRowWithId";
import { ReduxFilterDialogProps } from "../redux-filter-dialog";

export interface FilterTableToolbarProps<T extends TableRowWithId> extends ReduxFilterDialogProps {
  table: MRT_TableInstance<T>;
  selectedData: T[];
  // for dialogs
  anchor: React.RefObject<HTMLElement | null>;
}
