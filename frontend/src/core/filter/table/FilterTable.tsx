import { useTableInfiniteScroll } from "@hooks/useTableInfiniteScroll";
import { InfiniteData } from "@tanstack/react-query";
import {
  MRT_ColumnDef,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_SortingState,
  MRT_TableOptions,
  MRT_VisibilityState,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useCallback, useEffect, useRef, type UIEvent } from "react";
import { TableRowWithId } from "../_types/TableRowWithId";
import { FilterTableToolbarProps, FilterTableToolbarRight, useRenderFilterToolbars } from "../toolbar";

export interface FilterTableContainerProps<
  T extends TableRowWithId,
  TToolbarProps extends FilterTableToolbarProps<T> = FilterTableToolbarProps<T>,
  TFilter = unknown,
> {
  projectId: number;
  filter: TFilter;
  // selection
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<T>["onRowSelectionChange"];
  // sorting
  sortingModel: MRT_SortingState;
  onSortingChange: MRT_TableOptions<T>["onSortingChange"];
  // column visibility
  columnVisibilityModel: MRT_VisibilityState;
  onColumnVisibilityChange: MRT_TableOptions<T>["onColumnVisibilityChange"];
  // fetch size
  fetchSize: number;
  onFetchSizeChange: React.Dispatch<React.SetStateAction<number>>;
  // components
  positionToolbarAlertBanner?: MRT_TableOptions<T>["positionToolbarAlertBanner"];
  renderTopLeftToolbar: (props: TToolbarProps) => React.ReactNode;
  renderTopRightToolbar?: (props: TToolbarProps) => React.ReactNode;
  renderBottomToolbar?: (props: TToolbarProps) => React.ReactNode;
  toolbarExtraProps?: Omit<TToolbarProps, keyof FilterTableToolbarProps<T>>;
}

interface TablePage {
  total_results: number;
}

export interface FilterTableProps<
  T extends TableRowWithId,
  TToolbarProps extends FilterTableToolbarProps<T>,
  TPage extends TablePage,
> {
  // data info
  name: string;
  // column info
  columns: MRT_ColumnDef<T>[];
  // data fetching
  data: InfiniteData<TPage> | undefined;
  fetchNextPage: () => void;
  flatMapData: (page: TPage) => T[];
  lengthData?: (data: T[]) => number;
  isLoading: boolean;
  isError: boolean;
  isFetching: boolean;
  onFetchSizeChange: React.Dispatch<React.SetStateAction<number>>;
  // table state (selection, sorting, column visibility)
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<T>["onRowSelectionChange"];
  sortingModel: MRT_SortingState;
  onSortingChange: MRT_TableOptions<T>["onSortingChange"];
  columnVisibilityModel: MRT_VisibilityState;
  onColumnVisibilityChange: MRT_TableOptions<T>["onColumnVisibilityChange"];
  // components (alert banner, toolbars, error message)
  positionToolbarAlertBanner?: MRT_TableOptions<T>["positionToolbarAlertBanner"];
  renderTopLeftToolbar: (props: TToolbarProps) => React.ReactNode;
  renderTopRightToolbar?: (props: TToolbarProps) => React.ReactNode;
  renderBottomToolbar?: (props: TToolbarProps) => React.ReactNode;
  toolbarExtraProps?: Omit<TToolbarProps, keyof FilterTableToolbarProps<T>>;
  errorMessage?: string;
}

/**
 * Generic filter table component that can be used for different types of data and different filter state management (Redux or URL).
 * It handles the common logic for rendering a table with infinite scrolling, selection, sorting, column visibility, and toolbars.
 * The specific filter state management is delegated to the parent component via the renderTopLeftToolbar and toolbarExtraProps props.
 * @param name the name of the data being displayed, used for display purposes (e.g. "documents", "annotations", etc.)
 * @param columns the column definitions for the table
 * @param data the data for the table, which is an infinite query result
 * @param fetchNextPage the function to fetch the next page of data
 * @param flatMapData the function to flatten the paginated data into a single array of rows, which is specific to the data structure
 * @param lengthData the function to get the length of the data, which is used to determine if there are more pages to fetch. It can be omitted if the length can be obtained from the flat data through flatData.length, but it can be useful if the length is obtained in a different way (e.g. if the data is grouped and the length is the number of groups instead of the number of rows).
 * @param isLoading whether the initial data is loading
 * @param isError whether there was an error loading the data
 * @param isFetching whether more data is being fetched
 * @param onFetchSizeChange the function to call when the fetch size changes (e.g. when the user clicks "Fetch all"), which is used to update the fetch size state in the parent component
 * @param rowSelectionModel the current row selection state
 * @param onRowSelectionChange the function to call when the row selection changes
 * @param sortingModel the current sorting state
 * @param onSortingChange the function to call when the sorting changes
 * @param columnVisibilityModel the current column visibility state
 * @param onColumnVisibilityChange the function to call when the column visibility changes
 * @param positionToolbarAlertBanner the position of the alert banner, which can be used to adjust the layout of the table (e.g. if the alert banner is at the top, the table can have a smaller height to avoid overflow)
 * @param renderTopLeftToolbar the function to render the top left toolbar, which receives the necessary props for managing the filter state and other table actions
 * @param renderTopRightToolbar the function to render the top right toolbar, which receives the necessary props for managing the filter state and other table actions
 * @param renderBottomToolbar the function to render the bottom toolbar, which receives the necessary props for managing the filter state and other table actions
 * @param toolbarExtraProps extra props to pass to the toolbar components
 * @param errorMessage the error message to display when there is an error loading the data
 */
export function FilterTable<
  T extends TableRowWithId,
  TToolbarProps extends FilterTableToolbarProps<T>,
  TPage extends TablePage,
>({
  // data info
  name,
  // column info
  columns,
  // data fetching
  data,
  fetchNextPage,
  flatMapData,
  lengthData,
  isLoading,
  isError,
  isFetching,
  onFetchSizeChange,
  // table state (selection, sorting, column visibility)
  rowSelectionModel,
  onRowSelectionChange,
  sortingModel,
  onSortingChange,
  columnVisibilityModel,
  onColumnVisibilityChange,
  // components (toolbars, alert banner, error message)
  positionToolbarAlertBanner,
  renderTopLeftToolbar,
  renderTopRightToolbar = FilterTableToolbarRight,
  renderBottomToolbar,
  toolbarExtraProps,
  errorMessage = "Error loading data",
}: FilterTableProps<T, TToolbarProps, TPage>) {
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const { flatData, totalResults, totalFetched, fetchMoreOnScroll } = useTableInfiniteScroll({
    tableContainerRef,
    data,
    isFetching,
    fetchNextPage,
    flatMapData,
    lengthData,
  });

  // scroll to top when sorting changes
  useEffect(() => {
    try {
      rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
    } catch (error) {
      console.error(error);
    }
  }, [sortingModel]);

  const onTableScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => fetchMoreOnScroll(event.target as HTMLDivElement),
    [fetchMoreOnScroll],
  );

  const handleFetchAll = useCallback(() => {
    onFetchSizeChange(totalResults);
  }, [onFetchSizeChange, totalResults]);

  const { renderTopLeftToolbarContent, renderTopRightToolbarContent, renderBottomToolbarContent } =
    useRenderFilterToolbars({
      name,
      flatData,
      totalFetched,
      totalResults,
      handleFetchAll,
      renderTopRightToolbar,
      renderTopLeftToolbar: renderTopLeftToolbar || (() => null),
      renderBottomToolbar,
      toolbarExtraProps: toolbarExtraProps || ({} as Omit<TToolbarProps, keyof FilterTableToolbarProps<T>>),
      rowSelectionModel,
      tableContainerRef,
    });

  const table = useMaterialReactTable<T>({
    data: flatData,
    columns,
    getRowId: (row) => `${row.id}`,
    state: {
      rowSelection: rowSelectionModel,
      sorting: sortingModel,
      columnVisibility: columnVisibilityModel,
      isLoading,
      showAlertBanner: isError,
      showProgressBars: isFetching,
    },
    enableRowSelection: true,
    onRowSelectionChange,
    enableRowVirtualization: true,
    rowVirtualizerInstanceRef,
    rowVirtualizerOptions: { overscan: 4 },
    manualFiltering: true,
    enableColumnFilters: false,
    enablePagination: false,
    manualSorting: true,
    onSortingChange,
    onColumnVisibilityChange,
    muiTablePaperProps: {
      elevation: 0,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      ref: tableContainerRef,
      onScroll: onTableScroll,
      style: { flexGrow: 1 },
    },
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: errorMessage,
        }
      : undefined,
    positionToolbarAlertBanner,
    renderTopToolbarCustomActions: renderTopLeftToolbarContent,
    renderToolbarInternalActions: renderTopRightToolbarContent,
    renderBottomToolbarCustomActions: renderBottomToolbarContent,
  });

  return <MaterialReactTable table={table} />;
}
