import { useInfiniteQuery } from "@tanstack/react-query";
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
import { memo, useCallback, useEffect, useMemo, useRef, type UIEvent } from "react";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { SpanAnnotationRow } from "../../../api/openapi/models/SpanAnnotationRow.ts";
import { SpanAnnotationSearchResult } from "../../../api/openapi/models/SpanAnnotationSearchResult.ts";
import { SpanColumns } from "../../../api/openapi/models/SpanColumns.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { QueryKey } from "../../../api/QueryKey.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { useTableInfiniteScroll } from "../../../utils/useTableInfiniteScroll.ts";
import CodeRenderer from "../../Code/CodeRenderer.tsx";
import { MyFilter, createEmptyFilter } from "../../FilterDialog/filterUtils.ts";
import FilterTableToolbarLeft from "../../FilterTable/FilterTableToolbarLeft.tsx";
import { FilterTableToolbarProps } from "../../FilterTable/FilterTableToolbarProps.ts";
import FilterTableToolbarRight from "../../FilterTable/FilterTableToolbarRight.tsx";
import { useRenderToolbars } from "../../FilterTable/hooks/useRenderToolbars.tsx";
import { FilterTableProps } from "../../FilterTable/types/FilterTableProps.ts";
import MemoRenderer2 from "../../Memo/MemoRenderer2.tsx";
import SdocMetadataRenderer from "../../Metadata/SdocMetadataRenderer.tsx";
import SdocTagsRenderer from "../../SourceDocument/SdocTagRenderer.tsx";
import UserRenderer from "../../User/UserRenderer.tsx";
import { SATFilterActions } from "./satFilterSlice.ts";
import SdocAnnotationLink from "./SdocAnnotationLink.tsx";
import { useInitSATFilterSlice } from "./useInitSATFilterSlice.ts";

const flatMapData = (page: SpanAnnotationSearchResult) => page.data;

export interface SpanAnnotationTableProps {
  projectId: number;
  filterName: string;
  // selection
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<SpanAnnotationRow>["onRowSelectionChange"];
  // sorting
  sortingModel: MRT_SortingState;
  onSortingChange: MRT_TableOptions<SpanAnnotationRow>["onSortingChange"];
  // column visibility
  columnVisibilityModel: MRT_VisibilityState;
  onColumnVisibilityChange: MRT_TableOptions<SpanAnnotationRow>["onColumnVisibilityChange"];
  // components
  positionToolbarAlertBanner?: MRT_TableOptions<SpanAnnotationRow>["positionToolbarAlertBanner"];
  renderTopRightToolbar?: (props: FilterTableToolbarProps<SpanAnnotationRow>) => React.ReactNode;
  renderTopLeftToolbar?: (props: FilterTableToolbarProps<SpanAnnotationRow>) => React.ReactNode;
  renderBottomToolbar?: (props: FilterTableToolbarProps<SpanAnnotationRow>) => React.ReactNode;
}

// this defines which filter slice is used
const filterStateSelector = (state: RootState) => state.satFilter;
const filterActions = SATFilterActions;

function SpanAnnotationTable({
  projectId,
  filterName,
  rowSelectionModel,
  onRowSelectionChange,
  sortingModel,
  onSortingChange,
  columnVisibilityModel,
  onColumnVisibilityChange,
  fetchSize,
  onFetchSizeChange,
  positionToolbarAlertBanner = "top",
  renderTopRightToolbar = FilterTableToolbarRight,
  renderTopLeftToolbar = FilterTableToolbarLeft,
  renderBottomToolbar,
}: FilterTableProps<SpanAnnotationRow>) {
  // global client state (react router)
  const { user } = useAuth();
  const userId = user?.id;

  // filtering
  const filter =
    useAppSelector((state) => filterStateSelector(state).filter[filterName]) || createEmptyFilter(filterName);

  // virtualization
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitSATFilterSlice({ projectId });
  const columns: MRT_ColumnDef<SpanAnnotationRow>[] = useMemo(() => {
    if (!tableInfo || !user) return [];

    const result = tableInfo.map((column) => {
      const colDef = {
        id: column.column,
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case SpanColumns.SP_SOURCE_SOURCE_DOCUMENT_NAME:
          return {
            ...colDef,
            accessorFn: (row) => row.sdoc.name,
            Cell: ({ row }) => <SdocAnnotationLink sdoc={row.original.sdoc} annotation={row.original} />,
          } as MRT_ColumnDef<SpanAnnotationRow>;
        case SpanColumns.SP_TAG_ID_LIST:
          return {
            ...colDef,
            accessorFn: (row) => row.tag_ids,
            Cell: ({ row }) => <SdocTagsRenderer tagIds={row.original.tag_ids} />,
          } as MRT_ColumnDef<SpanAnnotationRow>;
        case SpanColumns.SP_CODE_ID:
          return {
            ...colDef,
            accessorFn: (row) => row.code,
            Cell: ({ row }) => <CodeRenderer code={row.original.code} />,
          } as MRT_ColumnDef<SpanAnnotationRow>;
        case SpanColumns.SP_USER_ID:
          return {
            ...colDef,
            accessorFn: (row) => row.user_id,
            Cell: ({ row }) => <UserRenderer user={row.original.user_id} />,
          } as MRT_ColumnDef<SpanAnnotationRow>;
        case SpanColumns.SP_MEMO_CONTENT:
          return {
            ...colDef,
            accessorFn: (row) => row.memo,
            Cell: ({ row }) =>
              user ? (
                <MemoRenderer2
                  attachedObjectType={AttachedObjectType.SPAN_ANNOTATION}
                  attachedObjectId={row.original.id}
                  showTitle={false}
                  showContent
                  showIcon={false}
                />
              ) : null,
          } as MRT_ColumnDef<SpanAnnotationRow>;
        case SpanColumns.SP_SPAN_TEXT:
          return {
            ...colDef,
            accessorFn: (row) => row.span_text,
          } as MRT_ColumnDef<SpanAnnotationRow>;
        default:
          if (!isNaN(parseInt(column.column))) {
            return {
              ...colDef,
              accessorFn: () => null,
              Cell: ({ row }) => (
                <SdocMetadataRenderer sdocId={row.original.sdoc.id} projectMetadataId={parseInt(column.column)} />
              ),
            } as MRT_ColumnDef<SpanAnnotationRow>;
          } else {
            return {
              ...colDef,
              accessorFn: () => null,
              Cell: () => <i>Cannot render column {column.column}</i>,
            } as MRT_ColumnDef<SpanAnnotationRow>;
          }
      }
    });

    return result;
  }, [tableInfo, user]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<SpanAnnotationSearchResult>({
    queryKey: [
      QueryKey.SPAN_ANNO_TABLE,
      projectId,
      filter, //refetch when columnFilters changes
      sortingModel, //refetch when sorting changes
      fetchSize,
    ],
    queryFn: ({ pageParam }) =>
      SearchService.searchSpanAnnotations({
        projectId: projectId!,
        requestBody: {
          filter: filter as MyFilter<SpanColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as SpanColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
        page: pageParam as number,
        pageSize: fetchSize,
      }),
    initialPageParam: 0,
    enabled: !!projectId && !!userId,
    getNextPageParam: (_lastGroup, groups) => {
      return groups.length;
    },
    refetchOnWindowFocus: false,
  });

  // infinite scrolling
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const { flatData, totalResults, totalFetched, fetchMoreOnScroll } = useTableInfiniteScroll({
    tableContainerRef,
    data,
    isFetching,
    fetchNextPage,
    flatMapData,
  });

  // infinite scrolling reset:
  // scroll to top of table when sorting changes
  useEffect(() => {
    try {
      rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
    } catch (error) {
      console.error(error);
    }
  }, [projectId, sortingModel]);

  // Table event handlers
  const handleTableScroll = useCallback(
    (event: UIEvent<HTMLDivElement>) => fetchMoreOnScroll(event.target as HTMLDivElement),
    [fetchMoreOnScroll],
  );

  // fetch all
  const handleFetchAll = useCallback(() => {
    onFetchSizeChange(totalResults);
  }, [onFetchSizeChange, totalResults]);

  // rendering
  const { renderTopLeftToolbarContent, renderTopRightToolbarContent, renderBottomToolbarContent } = useRenderToolbars({
    name: "span annotations",
    flatData,
    totalFetched,
    totalResults,
    handleFetchAll,
    renderTopRightToolbar,
    renderTopLeftToolbar,
    renderBottomToolbar,
    filterStateSelector,
    filterActions,
    filterName,
    rowSelectionModel,
    tableContainerRef,
  });

  // table
  const table = useMaterialReactTable<SpanAnnotationRow>({
    data: flatData,
    columns: columns,
    getRowId: (row) => `${row.id}`,
    // state
    state: {
      rowSelection: rowSelectionModel,
      sorting: sortingModel,
      columnVisibility: columnVisibilityModel,
      isLoading: isLoading || columns.length === 0,
      showAlertBanner: isError,
      showProgressBars: isFetching,
    },
    // selection
    enableRowSelection: true,
    onRowSelectionChange,
    // virtualization
    enableRowVirtualization: true,
    rowVirtualizerInstanceRef: rowVirtualizerInstanceRef,
    rowVirtualizerOptions: { overscan: 4 },
    // filtering
    manualFiltering: true,
    enableColumnFilters: false,
    // pagination
    enablePagination: false,
    // sorting
    manualSorting: true,
    onSortingChange,
    // column visiblility
    onColumnVisibilityChange,
    // mui components
    muiTablePaperProps: {
      elevation: 0,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      ref: tableContainerRef, //get access to the table container element
      onScroll: handleTableScroll,
      style: { flexGrow: 1 },
    },
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,
    // toolbar
    positionToolbarAlertBanner,
    renderTopToolbarCustomActions: renderTopLeftToolbarContent,
    renderToolbarInternalActions: renderTopRightToolbarContent,
    renderBottomToolbarCustomActions: renderBottomToolbarContent,
  });

  return <MaterialReactTable table={table} />;
}

export default memo(SpanAnnotationTable);
