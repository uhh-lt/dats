import { useInfiniteQuery } from "@tanstack/react-query";
import { MRT_ColumnDef, MRT_RowVirtualizer, MaterialReactTable, useMaterialReactTable } from "material-react-table";
import { memo, useCallback, useEffect, useMemo, useRef, type UIEvent } from "react";
import { QueryKey } from "../../../api/QueryKey.ts";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType.ts";
import { SentAnnoColumns } from "../../../api/openapi/models/SentAnnoColumns.ts";
import { SentenceAnnotationRow } from "../../../api/openapi/models/SentenceAnnotationRow.ts";
import { SentenceAnnotationSearchResult } from "../../../api/openapi/models/SentenceAnnotationSearchResult.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { MyFilter, createEmptyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import { FilterTableToolbarLeft } from "../../../components/FilterTable/FilterTableToolbarLeft.tsx";
import { FilterTableToolbarRight } from "../../../components/FilterTable/FilterTableToolbarRight.tsx";
import { useRenderToolbars } from "../../../components/FilterTable/hooks/useRenderToolbars.tsx";
import { FilterTableProps } from "../../../components/FilterTable/types/FilterTableProps.ts";
import { useAuth } from "../../../features/auth/useAuth.ts";
import { useTableInfiniteScroll } from "../../../hooks/useTableInfiniteScroll.ts";
import { useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { CodeRenderer } from "../../code/renderer/CodeRenderer.tsx";
import { MemoRenderer2 } from "../../memo/renderer/MemoRenderer2.tsx";
import { SdocMetadataRenderer } from "../../sdoc-metadata/renderer/SdocMetadataRenderer.tsx";
import { SdocTagsRenderer } from "../../source-document/renderer/SdocTagRenderer.tsx";
import { UserRenderer } from "../../user/renderer/UserRenderer.tsx";
import { SdocAnnotationLink } from "./components/SdocAnnotationLink.tsx";
import { useInitSEATFilterSlice } from "./hooks/useInitSEATFilterSlice.ts";
import { SEATFilterActions } from "./seatFilterSlice.ts";

const flatMapData = (page: SentenceAnnotationSearchResult) => page.data;

// this defines which filter slice is used
const filterStateSelector = (state: RootState) => state.seatFilter;
const filterActions = SEATFilterActions;

export const SentenceAnnotationTable = memo(
  ({
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
  }: FilterTableProps<SentenceAnnotationRow>) => {
    // global client state (react router)
    const { user } = useAuth();
    const userId = user?.id;

    // filtering
    const filter =
      useAppSelector((state) => filterStateSelector(state).filter[filterName]) || createEmptyFilter(filterName);

    // virtualization
    const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

    // table columns
    const tableInfo = useInitSEATFilterSlice({ projectId });
    const columns: MRT_ColumnDef<SentenceAnnotationRow>[] = useMemo(() => {
      if (!tableInfo || !user) return [];

      const result = tableInfo.map((column) => {
        const colDef = {
          id: column.column,
          header: column.label,
          enableSorting: column.sortable,
        };

        switch (column.column) {
          case SentAnnoColumns.SENT_ANNO_SOURCE_SOURCE_DOCUMENT_NAME:
            return {
              ...colDef,
              accessorFn: (row) => row.sdoc.name,
              Cell: ({ row }) => <SdocAnnotationLink sdoc={row.original.sdoc} annotation={row.original} />,
            } as MRT_ColumnDef<SentenceAnnotationRow>;
          case SentAnnoColumns.SENT_ANNO_TAG_ID_LIST:
            return {
              ...colDef,
              accessorFn: (row) => row.tag_ids,
              Cell: ({ row }) => <SdocTagsRenderer tagIds={row.original.tag_ids} />,
            } as MRT_ColumnDef<SentenceAnnotationRow>;
          case SentAnnoColumns.SENT_ANNO_CODE_ID:
            return {
              ...colDef,
              accessorFn: (row) => row.code,
              Cell: ({ row }) => <CodeRenderer code={row.original.code} />,
            } as MRT_ColumnDef<SentenceAnnotationRow>;
          case SentAnnoColumns.SENT_ANNO_USER_ID:
            return {
              ...colDef,
              accessorFn: (row) => row.user_id,
              Cell: ({ row }) => <UserRenderer user={row.original.user_id} />,
            } as MRT_ColumnDef<SentenceAnnotationRow>;
          case SentAnnoColumns.SENT_ANNO_MEMO_CONTENT:
            return {
              ...colDef,
              accessorFn: (row) => row.memo,
              Cell: ({ row }) =>
                user ? (
                  <MemoRenderer2
                    attachedObjectType={AttachedObjectType.SENTENCE_ANNOTATION}
                    attachedObjectId={row.original.id}
                    showTitle={false}
                    showContent
                    showIcon={false}
                  />
                ) : null,
            } as MRT_ColumnDef<SentenceAnnotationRow>;
          // case SentAnnoColumns.SENT_ANNO_SPAN_TEXT:
          //   return {
          //     ...colDef,
          //     accessorFn: (row) => row.text,
          //   } as MRT_ColumnDef<SentenceAnnotationRow>;
          default:
            if (!isNaN(parseInt(column.column))) {
              return {
                ...colDef,
                accessorFn: () => null,
                Cell: ({ row }) => (
                  <SdocMetadataRenderer sdocId={row.original.sdoc.id} projectMetadataId={parseInt(column.column)} />
                ),
              } as MRT_ColumnDef<SentenceAnnotationRow>;
            } else {
              return {
                ...colDef,
                accessorFn: () => null,
                Cell: () => <i>Cannot render column {column.column}</i>,
              } as MRT_ColumnDef<SentenceAnnotationRow>;
            }
        }
      });

      return [
        {
          id: "text",
          header: "Annotated Sentences",
          enableSorting: false,
          accessorFn: (row) => row.text,
        } as MRT_ColumnDef<SentenceAnnotationRow>,
        ...result,
      ];
    }, [tableInfo, user]);

    // table data
    const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<SentenceAnnotationSearchResult>({
      queryKey: [
        QueryKey.SENT_ANNO_TABLE,
        projectId,
        filter, //refetch when columnFilters changes
        sortingModel, //refetch when sorting changes
        fetchSize,
      ],
      queryFn: ({ pageParam }) =>
        SearchService.searchSentenceAnnotations({
          projectId: projectId!,
          requestBody: {
            filter: filter as MyFilter<SentAnnoColumns>,
            sorts: sortingModel.map((sort) => ({
              column: sort.id as SentAnnoColumns,
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
    const { renderTopLeftToolbarContent, renderTopRightToolbarContent, renderBottomToolbarContent } = useRenderToolbars(
      {
        name: "sentence annotations",
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
      },
    );

    // table
    const table = useMaterialReactTable<SentenceAnnotationRow>({
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
  },
);
