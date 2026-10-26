import { MRT_RowData, MRT_TableInstance } from "material-react-table";
import { FilterPopoverProps, ReduxFilterPopoverProps, URLFilterPopoverProps } from "../filter-popovers";

export type FilterTableToolbarProps<T extends MRT_RowData> = {
  table: MRT_TableInstance<T>;
  selectedData: T[];
  anchor: React.RefObject<HTMLElement | null>;
};

export type ReduxFilterTableToolbarProps<T extends MRT_RowData> = FilterTableToolbarProps<T> & ReduxFilterPopoverProps;

export type URLFilterTableToolbarProps<T extends MRT_RowData> = FilterTableToolbarProps<T> & URLFilterPopoverProps;

export type LocalFilterTableToolbarProps<
  T extends MRT_RowData,
  U extends string = string,
> = FilterTableToolbarProps<T> & FilterPopoverProps<U>;
