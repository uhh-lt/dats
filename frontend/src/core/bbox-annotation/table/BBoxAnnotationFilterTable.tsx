import { QueryKey } from "@api/hooks/QueryKey";
import { SearchService } from "@api/services/SearchService";
import { ImageCropper } from "@components/ImageCropper";
import { CodeRenderer } from "@core/code";
import {
  createEmptyFilter,
  FILTER_PARAM,
  FilterDialogProps,
  FilterTable,
  FilterTableContainerProps,
  FilterTableToolbarProps,
  LocalFilterTableToolbarLeft,
  LocalFilterTableToolbarProps,
  MyFilter,
  ReduxFilterDialogProps,
  ReduxFilterTableToolbarLeft,
  ReduxFilterTableToolbarProps,
  URLFilterDialogProps,
  URLFilterTableToolbarLeft,
  URLFilterTableToolbarProps,
} from "@core/filter";
import { MemoRenderer2 } from "@core/memo";
import { SdocMetadataRenderer } from "@core/sdoc-metadata";
import { SdocTagsRenderer } from "@core/source-document";
import { useResetStateOnSearch } from "@hooks/useResetStateOnSearch";
import { useURLConnector } from "@hooks/useURLConnector";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { BBoxAnnotationRow } from "@models/BBoxAnnotationRow";
import { BBoxAnnotationSearchResult } from "@models/BBoxAnnotationSearchResult";
import { BBoxColumns } from "@models/BBoxColumns";
import { SortDirection } from "@models/SortDirection";
import { RootState } from "@store/store";
import { useAppSelector } from "@store/storeHooks";
import { useInfiniteQuery } from "@tanstack/react-query";
import { MRT_ColumnDef } from "material-react-table";
import { memo, useCallback, useMemo } from "react";
import { useInitBBoxFilterSlice } from "./_hooks/useInitBBoxFilterSlice";
import { BBoxFilterActions, defaultBBoxFilterExpression } from "./bboxFilterSlice";

const flatMapData = (page: BBoxAnnotationSearchResult) => page.data;

/**
 * Component for rendering a filter table for BBox annotations.
 * The filter state can be managed either via Redux or via URL search params, which is determined by the parent component (BBoxAnnotationReduxFilterTable or BBoxAnnotationURLFilterTable).
 * It defines the columns and how to fetch the data, while the actual filter state management is delegated to the parent component.
 *
 * @param filter the filter state, which is either obtained from Redux or from URL search params, depending on the parent component
 * @param renderTopLeftToolbar the function to render the top left toolbar, which is either the ReduxFilterTableToolbarLeft or the URLFilterTableToolbarLeft, depending on the parent component
 * @param toolbarExtraProps the extra props to pass to the toolbar, which contains the necessary information for managing the filter state (either Redux or URL)
 */
const BBoxAnnotationFilterTable = <TToolbarProps extends FilterTableToolbarProps<BBoxAnnotationRow>>({
  projectId,
  filter,
  rowSelectionModel,
  onRowSelectionChange,
  sortingModel,
  onSortingChange,
  columnVisibilityModel,
  onColumnVisibilityChange,
  fetchSize,
  onFetchSizeChange,
  onSearchParameterChange,
  positionToolbarAlertBanner = "top",
  renderTopRightToolbar,
  renderTopLeftToolbar,
  renderBottomToolbar,
  toolbarExtraProps,
}: FilterTableContainerProps<BBoxAnnotationRow, TToolbarProps, MyFilter<BBoxColumns>>) => {
  // table columns
  const tableInfo = useInitBBoxFilterSlice({ projectId });
  const columns: MRT_ColumnDef<BBoxAnnotationRow>[] = useMemo(() => {
    if (!tableInfo) return [];

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
            Cell: ({ row }) => (
              <MemoRenderer2
                attachedObjectType={AttachedObjectType.BBOX_ANNOTATION}
                attachedObjectId={row.original.id}
                showTitle={false}
                showContent
                showIcon={false}
              />
            ),
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
  }, [tableInfo]);

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

  // resetting search-parameter-dependant state
  const resetState = useCallback(() => {
    onRowSelectionChange?.({});
    onFetchSizeChange?.(20);
    onSearchParameterChange?.();
  }, [onRowSelectionChange, onFetchSizeChange, onSearchParameterChange]);
  useResetStateOnSearch([filter, sortingModel], resetState);

  return (
    <FilterTable
      name="bbox annotations"
      columns={columns}
      getRowId={(row) => `${row.id}`}
      data={data}
      fetchNextPage={fetchNextPage}
      flatMapData={flatMapData}
      isLoading={isLoading || columns.length === 0}
      isError={isError}
      isFetching={isFetching}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={onRowSelectionChange}
      sortingModel={sortingModel}
      onSortingChange={onSortingChange}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityChange={onColumnVisibilityChange}
      onFetchSizeChange={onFetchSizeChange}
      positionToolbarAlertBanner={positionToolbarAlertBanner}
      renderTopRightToolbar={renderTopRightToolbar}
      renderTopLeftToolbar={renderTopLeftToolbar}
      renderBottomToolbar={renderBottomToolbar}
      toolbarExtraProps={toolbarExtraProps}
    />
  );
};

// configs for redux filter table
const filterStateSelector = (state: RootState) => state.bboxFilter;
const filterActions = BBoxFilterActions;

/**
 * Redux-based filter table for bbox annotations.
 * The filter state is stored under state.bboxFilter.filter[filterName].
 *
 * @param filterName used to identify the filter state in the redux store, so that multiple tables can be used without conflicts.
 */
export const BBoxAnnotationReduxFilterTable = memo(
  ({
    filterName,
    ...tableProps
  }: Omit<
    FilterTableContainerProps<
      BBoxAnnotationRow,
      ReduxFilterTableToolbarProps<BBoxAnnotationRow>,
      MyFilter<BBoxColumns>
    >,
    "filter" | "renderTopLeftToolbar" | "toolbarExtraProps"
  > &
    Omit<ReduxFilterDialogProps, "filterActions" | "filterStateSelector">) => {
    const filter =
      useAppSelector((state) => filterStateSelector(state).filter[filterName]) || createEmptyFilter(filterName);

    return (
      <BBoxAnnotationFilterTable
        {...tableProps}
        filter={filter as MyFilter<BBoxColumns>}
        renderTopLeftToolbar={ReduxFilterTableToolbarLeft}
        toolbarExtraProps={{
          filterName,
          filterStateSelector,
          filterActions,
        }}
      />
    );
  },
);

// configs for URL filter table
const column2InfoSelector = (state: RootState) => state.bboxFilter.column2Info;
const defaultFilterExpression = defaultBBoxFilterExpression;

/**
 * URL-based filter table for bbox annotations.
 * The filter state is synced with the URL, so it can be shared via URL and is preserved on page reload.
 *
 * @param routeApi used to read and write the URL search params, it can be obtained via useRouteApi().
 */
export const BBoxAnnotationURLFilterTable = memo(
  ({
    routeApi,
    renderTopLeftToolbar = URLFilterTableToolbarLeft,
    ...tableProps
  }: Omit<
    FilterTableContainerProps<BBoxAnnotationRow, URLFilterTableToolbarProps<BBoxAnnotationRow>, MyFilter<BBoxColumns>>,
    "filter" | "toolbarExtraProps"
  > &
    Omit<URLFilterDialogProps, "column2InfoSelector" | "defaultFilterExpression" | "filterName">) => {
    const [filter] = useURLConnector(routeApi, FILTER_PARAM);

    return (
      <BBoxAnnotationFilterTable
        {...tableProps}
        filter={filter}
        renderTopLeftToolbar={renderTopLeftToolbar}
        toolbarExtraProps={{
          routeApi,
          defaultFilterExpression,
          column2InfoSelector,
        }}
      />
    );
  },
);

/**
 * Local filter table for bbox annotations.
 * The filter state is managed by the parent component and passed via props, so it is fully flexible and can be used in any context.
 */
export const BBoxAnnotationLocalFilterTable = memo(
  ({
    filterName,
    filter,
    onFilterChange,
    expertMode,
    onExpertModeChange,
    renderTopLeftToolbar = LocalFilterTableToolbarLeft,
    ...tableProps
  }: Omit<
    FilterTableContainerProps<
      BBoxAnnotationRow,
      LocalFilterTableToolbarProps<BBoxAnnotationRow, BBoxColumns>,
      MyFilter<BBoxColumns>
    >,
    "filter" | "toolbarExtraProps"
  > &
    Omit<FilterDialogProps<BBoxColumns>, "column2Info" | "defaultFilterExpression">) => {
    const column2Info = useAppSelector(column2InfoSelector);

    return (
      <BBoxAnnotationFilterTable
        {...tableProps}
        filter={filter}
        renderTopLeftToolbar={renderTopLeftToolbar}
        toolbarExtraProps={{
          filterName,
          defaultFilterExpression: defaultFilterExpression,
          column2Info,
          filter,
          onFilterChange,
          expertMode,
          onExpertModeChange,
        }}
      />
    );
  },
);
