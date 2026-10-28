import { ImageCropper } from "@components/ImageCropper";
import { CodeRenderer } from "@core/code";
import {
  createEmptyFilter,
  FILTER_PARAM,
  FilterTable,
  FilterTableContainerProps,
  FilterTableToolbarProps,
  LocalFilterTableProps,
  LocalFilterTableToolbarLeft,
  MyFilter,
  ReduxFilterTableProps,
  ReduxFilterTableToolbarLeft,
  toSorts,
  URLFilterTableProps,
  URLFilterTableToolbarLeft,
} from "@core/filter";
import { MemoIndicator } from "@core/memo";
import { SdocMetadataRenderer } from "@core/sdoc-metadata";
import { SdocFolderRenderer, SdocTagsRenderer } from "@core/source-document";
import { UserRenderer } from "@core/user";
import { useResetStateOnSearch } from "@hooks/useResetStateOnSearch";
import { useURLConnector } from "@hooks/useURLConnector";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { BBoxAnnotationRow } from "@models/BBoxAnnotationRow";
import { BBoxColumns } from "@models/BBoxColumns";
import { Page_BBoxAnnotationRow_ } from "@models/Page_BBoxAnnotationRow_";
import { RootState } from "@store/store";
import { useAppSelector } from "@store/storeHooks";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { MRT_ColumnDef } from "material-react-table";
import { memo, useCallback, useMemo } from "react";
import { bboxAnnotationQueries } from "../api/bboxAnnotationQueries";
import { defaultBBoxFilterExpression, BBoxFilterActions } from "./bboxFilterSlice";

const flatMapData = (page: Page_BBoxAnnotationRow_) => page.items;

/**
 * Filter table for bbox annotations: defines the columns and fetches the data.
 * Where the filter lives (Redux, URL or the caller) is decided by the variants below, which pass the filter and the
 * matching top left toolbar.
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
  renderTopLeftToolbar,
  renderTopRightToolbar,
  renderBottomToolbar,
  toolbarExtraProps,
}: FilterTableContainerProps<BBoxAnnotationRow, TToolbarProps, MyFilter<BBoxColumns>>) => {
  // table columns
  const { data: tableInfo } = useQuery(bboxAnnotationQueries.tableInfo(projectId));
  const columns = useMemo(() => {
    if (!tableInfo) return [];

    // custom columns
    const previewColumn: MRT_ColumnDef<BBoxAnnotationRow> = {
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
    };

    const result = tableInfo.map((column): MRT_ColumnDef<BBoxAnnotationRow> => {
      const colDef: MRT_ColumnDef<BBoxAnnotationRow> = {
        id: column.column,
        accessorFn: () => null,
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case BBoxColumns.BB_SOURCE_SOURCE_DOCUMENT_NAME:
          return {
            ...colDef,
            accessorFn: (row) => row.sdoc.name,
          };
        case BBoxColumns.BB_TAG_ID_LIST_RECURSIVE:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocTagsRenderer tagIds={row.original.tag_ids} />,
          };
        case BBoxColumns.BB_CODE_ID_LIST_RECURSIVE:
          return {
            ...colDef,
            Cell: ({ row }) => <CodeRenderer code={row.original.code} renderMemoIndicator />,
          };
        case BBoxColumns.BB_USER_ID:
          return {
            ...colDef,
            accessorFn: (row) => row.user_id,
            Cell: ({ row }) => <UserRenderer user={row.original.user_id} />,
          };
        case BBoxColumns.BB_MEMO_CONTENT:
          return {
            ...colDef,
            Cell: ({ row }) => (
              <MemoIndicator
                memoIds={row.original.memo_ids}
                attachedObjectType={AttachedObjectType.BBOX_ANNOTATION}
                attachedObjectId={row.original.id}
              />
            ),
          };
        case BBoxColumns.BB_FOLDER_ID_LIST_RECURSIVE:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocFolderRenderer sdocId={row.original.sdoc.id} renderName renderIcon />,
          };
        default:
          if (!isNaN(parseInt(column.column))) {
            return {
              ...colDef,
              Cell: ({ row }) => (
                <SdocMetadataRenderer sdocId={row.original.sdoc.id} projectMetadataId={parseInt(column.column)} />
              ),
            };
          }
          return {
            ...colDef,
            Cell: () => <i>Cannot render column {column.column}</i>,
          };
      }
    });

    return [previewColumn, ...result];
  }, [tableInfo]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery(
    bboxAnnotationQueries.search({
      project_id: projectId,
      filter,
      sorts: toSorts<BBoxColumns>(sortingModel),
      page_size: fetchSize,
    }),
  );

  // resetting search-parameter-dependant state
  const resetState = useCallback(() => {
    onRowSelectionChange?.({});
    onFetchSizeChange(20);
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
      onFetchSizeChange={onFetchSizeChange}
      rowSelectionModel={rowSelectionModel}
      onRowSelectionChange={onRowSelectionChange}
      sortingModel={sortingModel}
      onSortingChange={onSortingChange}
      columnVisibilityModel={columnVisibilityModel}
      onColumnVisibilityChange={onColumnVisibilityChange}
      renderTopLeftToolbar={renderTopLeftToolbar}
      renderTopRightToolbar={renderTopRightToolbar}
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
 * @param filterName identifies the filter in the redux store, so that multiple tables can be used without conflicts.
 */
export const BBoxAnnotationReduxFilterTable = memo(
  ({
    filterName,
    renderTopLeftToolbar = ReduxFilterTableToolbarLeft,
    ...tableProps
  }: ReduxFilterTableProps<BBoxAnnotationRow, BBoxColumns>) => {
    const reduxFilter = useAppSelector((state) => filterStateSelector(state).filter[filterName]);
    const filter = useMemo(() => reduxFilter || createEmptyFilter(filterName), [reduxFilter, filterName]);
    const tableInfoOptions = useMemo(
      () => bboxAnnotationQueries.tableInfo(tableProps.projectId),
      [tableProps.projectId],
    );

    return (
      <BBoxAnnotationFilterTable
        {...tableProps}
        filter={filter as MyFilter<BBoxColumns>}
        renderTopLeftToolbar={renderTopLeftToolbar}
        toolbarExtraProps={{
          filterName,
          filterStateSelector,
          filterActions,
          tableInfoOptions,
        }}
      />
    );
  },
);

// configs for URL and local filter table
const defaultFilterExpression = defaultBBoxFilterExpression;

/**
 * URL-based filter table for bbox annotations.
 * The filter state is synced with the URL, so it can be shared via URL and is preserved on page reload.
 *
 * @param routeApi reads and writes the URL search params, it can be obtained via useRouteApi().
 */
export const BBoxAnnotationURLFilterTable = memo(
  ({
    routeApi,
    renderTopLeftToolbar = URLFilterTableToolbarLeft,
    ...tableProps
  }: URLFilterTableProps<BBoxAnnotationRow, BBoxColumns>) => {
    const [filter] = useURLConnector(routeApi, FILTER_PARAM);
    const tableInfoOptions = useMemo(
      () => bboxAnnotationQueries.tableInfo(tableProps.projectId),
      [tableProps.projectId],
    );

    return (
      <BBoxAnnotationFilterTable
        {...tableProps}
        filter={filter}
        renderTopLeftToolbar={renderTopLeftToolbar}
        toolbarExtraProps={{
          routeApi,
          defaultFilterExpression,
          tableInfoOptions,
        }}
      />
    );
  },
);

/**
 * Local filter table for bbox annotations.
 * The filter state is owned by the caller and passed via props, so it can be stored anywhere.
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
  }: LocalFilterTableProps<BBoxAnnotationRow, BBoxColumns>) => {
    const tableInfoOptions = bboxAnnotationQueries.tableInfo(tableProps.projectId);

    return (
      <BBoxAnnotationFilterTable
        {...tableProps}
        filter={filter}
        renderTopLeftToolbar={renderTopLeftToolbar}
        toolbarExtraProps={{
          filterName,
          defaultFilterExpression,
          tableInfoOptions,
          filter,
          onFilterChange,
          expertMode,
          onExpertModeChange,
        }}
      />
    );
  },
);
