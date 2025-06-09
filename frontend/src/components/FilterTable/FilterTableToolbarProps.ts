import { MRT_TableInstance } from "material-react-table";
import { ReduxFilterDialogProps } from "../FilterDialog/ReduxFilterDialogProps.ts";
import { TableRowWithId } from "./types/TableRowWithId.ts";

export interface FilterTableToolbarProps<T extends TableRowWithId> extends ReduxFilterDialogProps {
  table: MRT_TableInstance<T>;
  selectedData: T[];
  // for dialogs
  anchor: React.RefObject<HTMLElement>;
}
