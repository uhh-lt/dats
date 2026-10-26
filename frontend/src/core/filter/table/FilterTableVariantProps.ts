import { MRT_RowData } from "material-react-table";
import { FilterPopoverProps, ReduxFilterPopoverProps, URLFilterPopoverProps } from "../filter-popovers";
import { MyFilter } from "../filterUtils";
import {
  FilterTableToolbarProps,
  LocalFilterTableToolbarProps,
  ReduxFilterTableToolbarProps,
  URLFilterTableToolbarProps,
} from "../toolbar";
import { FilterTableContainerProps } from "./FilterTable";

// The props a <Domain><Variant>FilterTable takes from its caller: the container props without what the variant provides
// itself (the filter and the toolbar props). The top left toolbar is optional, the variant defaults it to its own one.
type FilterTableVariantProps<
  T extends MRT_RowData,
  TToolbarProps extends FilterTableToolbarProps<T>,
  TColumns extends string,
> = Omit<
  FilterTableContainerProps<T, TToolbarProps, MyFilter<TColumns>>,
  "filter" | "renderTopLeftToolbar" | "toolbarExtraProps"
> &
  Partial<Pick<FilterTableContainerProps<T, TToolbarProps, MyFilter<TColumns>>, "renderTopLeftToolbar">>;

/** Props of a <Domain>ReduxFilterTable: the filter lives in the domain's *FilterSlice under filter[filterName]. */
export type ReduxFilterTableProps<T extends MRT_RowData, TColumns extends string> = FilterTableVariantProps<
  T,
  ReduxFilterTableToolbarProps<T>,
  TColumns
> &
  Pick<ReduxFilterPopoverProps, "filterName">;

/** Props of a <Domain>URLFilterTable: the filter lives in the search params of the route (FILTER_PARAM). */
export type URLFilterTableProps<T extends MRT_RowData, TColumns extends string> = FilterTableVariantProps<
  T,
  URLFilterTableToolbarProps<T>,
  TColumns
> &
  Pick<URLFilterPopoverProps, "routeApi">;

/** Props of a <Domain>LocalFilterTable: the caller owns the filter and the expert mode. */
export type LocalFilterTableProps<T extends MRT_RowData, TColumns extends string> = FilterTableVariantProps<
  T,
  LocalFilterTableToolbarProps<T, TColumns>,
  TColumns
> &
  Omit<FilterPopoverProps<TColumns>, "tableInfoOptions" | "defaultFilterExpression">;
