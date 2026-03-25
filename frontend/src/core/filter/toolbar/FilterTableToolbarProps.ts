import { MRT_TableInstance } from "material-react-table";
import { TableRowWithId } from "../_types/TableRowWithId";
import { FilterDialogProps, ReduxFilterDialogProps, URLFilterDialogProps } from "../filter-dialogs";

export type FilterTableToolbarProps<T extends TableRowWithId> = {
  table: MRT_TableInstance<T>;
  selectedData: T[];
  anchor: React.RefObject<HTMLElement | null>;
};

export type ReduxFilterTableToolbarProps<T extends TableRowWithId> = FilterTableToolbarProps<T> &
  ReduxFilterDialogProps;

export type URLFilterTableToolbarProps<T extends TableRowWithId> = FilterTableToolbarProps<T> & URLFilterDialogProps;

export type LocalFilterTableToolbarProps<
  T extends TableRowWithId,
  U extends string = string,
> = FilterTableToolbarProps<T> & FilterDialogProps<U>;
