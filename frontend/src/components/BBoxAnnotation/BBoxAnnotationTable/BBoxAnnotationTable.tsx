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
import { BBoxAnnotationRow } from "../../../api/openapi/models/BBoxAnnotationRow.ts";
import { BBoxAnnotationSearchResult } from "../../../api/openapi/models/BBoxAnnotationSearchResult.ts";
import { BBoxColumns } from "../../../api/openapi/models/BBoxColumns.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { QueryKey } from "../../../api/QueryKey.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { useTableInfiniteScroll } from "../../../utils/useTableInfiniteScroll.ts";
import ImageCropper from "../../../views/whiteboard/nodes/ImageCropper.tsx";
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
import { BBoxFilterActions } from "./bboxFilterSlice.ts";
import { useInitBBoxFilterSlice } from "./useInitBBoxFilterSlice.ts";

const flatMapData = (page: BBoxAnnotationSearchResult) => page.data;

export interface BBoxAnnotationTableProps {
  projectId: number;
  filterName: string;
  // selection
  rowSelectionModel: MRT_RowSelectionState;
  onRowSelectionChange: MRT_TableOptions<BBoxAnnotationRow>["onRowSelectionChange"];
  // sorting
  sortingModel: MRT_SortingState;
  onSortingChange: MRT_TableOptions<BBoxAnnotationRow>["onSortingChange"];
  // column visibility
  columnVisibilityModel: MRT_VisibilityState;
  onColumnVisibilityChange: MRT_TableOptions<BBoxAnnotationRow>["onColumnVisibilityChange"];
  // components
  positionToolbarAlertBanner?: MRT_TableOptions<BBoxAnnotationRow>["positionToolbarAlertBanner"];
  renderTopRightToolbar?: (props: FilterTableToolbarProps<BBoxAnnotationRow>) => React.ReactNode;
  renderTopLeftToolbar?: (props: FilterTableToolbarProps<BBoxAnnotationRow>) => React.ReactNode;
  renderBottomToolbar?: (props: FilterTableToolbarProps<BBoxAnnotationRow>) => React.ReactNode;
}

// this defines which filter slice is used
const filterStateSelector = (state: RootState) => state.bboxFilter;
const filterActions = BBoxFilterActions;

function BBoxAnnotationTable({
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
}: FilterTableProps<BBoxAnnotationRow>) {
  // global client state (react router)
  const { user } = useAuth();

  // filtering
  const filter = useAppSelector((state) => state.bboxFilter.filter[filterName]) || createEmptyFilter(filterName);

  // virtualization
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitBBoxFilterSlice({ projectId });
  const columns: MRT_ColumnDef<BBoxAnnotationRow>[] = useMemo(() => {
    if (!tableInfo || !user) return [];

    const result = tableInfo.map((column) => {
      const colDef = {
        id: column.column,
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case BBoxColumns.BB_SOURCE_SOURCE_DOCUMENT_NAME:
          return {
            ...colDef,
            accessorFn: (row) => row.sdoc.name,
          } as MRT_ColumnDef<BBoxAnnotationRow>;
        case BBoxColumns.BB_TAG_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.sdoc.id} tagIds={row.original.tag_ids} />,
          } as MRT_ColumnDef<BBoxAnnotationRow>;
        case BBoxColumns.BB_CODE_ID:
          return {
            ...colDef,
            Cell: ({ row }) => <CodeRenderer code={row.original.code} />,
          } as MRT_ColumnDef<BBoxAnnotationRow>;
        case BBoxColumns.BB_MEMO_CONTENT:
          return {
            ...colDef,
            Cell: ({ row }) =>
              user ? (
                <MemoRenderer2
                  attachedObjectType={AttachedObjectType.BBOX_ANNOTATION}
                  attachedObjectId={row.original.id}
                  showTitle={false}
                  showContent
                  showIcon={false}
                />
              ) : null,
          } as MRT_ColumnDef<BBoxAnnotationRow>;
        default:
          if (!isNaN(parseInt(column.column))) {
            return {
              ...colDef,
              Cell: ({ row }) => (
                <SdocMetadataRenderer sdocId={row.original.sdoc.id} projectMetadataId={parseInt(column.column)} />
              ),
            } as MRT_ColumnDef<BBoxAnnotationRow>;
          } else {
            return {
              ...colDef,
              Cell: () => <i>Cannot render column {column.column}</i>,
            } as MRT_ColumnDef<BBoxAnnotationRow>;
          }
      }
    });

    // custom columns
    const previewCell = {
      id: "bbox",
      header: "Preview",
      enableSorting: false,
      accessorFn: (row) => row.x,
      Cell: ({ row }) => (
        <ImageCropper
          imageUrl={encodeURI("/content/" + row.original.url)}
          x={row.original.x}
          y={row.original.y}
          width={row.original.width}
          targetWidth={(row.original.width * 100) / row.original.height}
          height={row.original.height}
          targetHeight={100}
          style={{
            border: "4px solid " + row.original.code.color,
          }}
        />
      ),
    } as MRT_ColumnDef<BBoxAnnotationRow>;

    return [previewCell, ...result];
  }, [tableInfo, user]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<BBoxAnnotationSearchResult>({
    queryKey: [
      QueryKey.BBOX_TABLE,
      projectId,
      filter, //refetch when columnFilters changes
      sortingModel, //refetch when sorting changes
      fetchSize,
    ],
    queryFn: ({ pageParam }) =>
      SearchService.searchBboxAnnotations({
        projectId: projectId!,
        requestBody: {
          filter: filter as MyFilter<BBoxColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as BBoxColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
        page: pageParam as number,
        pageSize: fetchSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (_lastGroup, groups) => groups.length,
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
  // scroll to top of table when sorting or userId changes
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
    name: "bbox annotations",
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
  const table = useMaterialReactTable<BBoxAnnotationRow>({
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
      ref: tableContainerRef,
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

export default memo(BBoxAnnotationTable);
