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
import { Page_SpanAnnotationRow_ } from "@models/Page_SpanAnnotationRow_";
import { SpanAnnotationRow } from "@models/SpanAnnotationRow";
import { SpanColumns } from "@models/SpanColumns";
import { RootState } from "@store/store";
import { useAppSelector } from "@store/storeHooks";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { MRT_ColumnDef } from "material-react-table";
import { memo, useCallback, useMemo } from "react";
import { spanAnnotationQueries } from "../api/spanAnnotationQueries";
import { SdocAnnotationLink } from "./_components/SdocAnnotationLink";
import { defaultSATFilterExpression, SATFilterActions } from "./satFilterSlice";

const flatMapData = (page: Page_SpanAnnotationRow_) => page.items;

/**
 * Filter table for span annotations: defines the columns and fetches the data.
 * Where the filter lives (Redux, URL or the caller) is decided by the variants below, which pass the filter and the
 * matching top left toolbar.
 */
const SpanAnnotationFilterTable = <TToolbarProps extends FilterTableToolbarProps<SpanAnnotationRow>>({
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
}: FilterTableContainerProps<SpanAnnotationRow, TToolbarProps, MyFilter<SpanColumns>>) => {
  // table columns
  const { data: tableInfo } = useQuery(spanAnnotationQueries.tableInfo(projectId));
  const columns = useMemo(() => {
    if (!tableInfo) return [];

    return tableInfo.map((column): MRT_ColumnDef<SpanAnnotationRow> => {
      const colDef: MRT_ColumnDef<SpanAnnotationRow> = {
        id: column.column,
        accessorFn: () => null,
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case SpanColumns.SP_SOURCE_SOURCE_DOCUMENT_NAME:
          return {
            ...colDef,
            accessorFn: (row) => row.sdoc.name,
            Cell: ({ row }) => <SdocAnnotationLink sdoc={row.original.sdoc} annotation={row.original} />,
          };
        case SpanColumns.SP_TAG_ID_LIST_RECURSIVE:
          return {
            ...colDef,
            accessorFn: (row) => row.tag_ids,
            Cell: ({ row }) => <SdocTagsRenderer tagIds={row.original.tag_ids} />,
          };
        case SpanColumns.SP_CODE_ID_LIST_RECURSIVE:
          return {
            ...colDef,
            accessorFn: (row) => row.code,
            Cell: ({ row }) => <CodeRenderer code={row.original.code} renderMemoIndicator />,
          };
        case SpanColumns.SP_USER_ID:
          return {
            ...colDef,
            accessorFn: (row) => row.user_id,
            Cell: ({ row }) => <UserRenderer user={row.original.user_id} />,
          };
        case SpanColumns.SP_MEMO_CONTENT:
          return {
            ...colDef,
            Cell: ({ row }) => (
              <MemoIndicator
                memoIds={row.original.memo_ids}
                attachedObjectType={AttachedObjectType.SPAN_ANNOTATION}
                attachedObjectId={row.original.id}
              />
            ),
          };
        case SpanColumns.SP_SPAN_TEXT:
          return {
            ...colDef,
            accessorFn: (row) => row.span_text,
          };
        case SpanColumns.SP_FOLDER_ID_LIST_RECURSIVE:
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
  }, [tableInfo]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery(
    spanAnnotationQueries.search({
      project_id: projectId,
      filter,
      sorts: toSorts<SpanColumns>(sortingModel),
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
      name="span annotations"
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
const filterStateSelector = (state: RootState) => state.satFilter;
const filterActions = SATFilterActions;

/**
 * Redux-based filter table for span annotations.
 * The filter state is stored under state.satFilter.filter[filterName].
 *
 * @param filterName identifies the filter in the redux store, so that multiple tables can be used without conflicts.
 */
export const SpanAnnotationReduxFilterTable = memo(
  ({
    filterName,
    renderTopLeftToolbar = ReduxFilterTableToolbarLeft,
    ...tableProps
  }: ReduxFilterTableProps<SpanAnnotationRow, SpanColumns>) => {
    const reduxFilter = useAppSelector((state) => filterStateSelector(state).filter[filterName]);
    const filter = useMemo(() => reduxFilter || createEmptyFilter(filterName), [reduxFilter, filterName]);
    const tableInfoOptions = useMemo(
      () => spanAnnotationQueries.tableInfo(tableProps.projectId),
      [tableProps.projectId],
    );

    return (
      <SpanAnnotationFilterTable
        {...tableProps}
        filter={filter as MyFilter<SpanColumns>}
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
const defaultFilterExpression = defaultSATFilterExpression;

/**
 * URL-based filter table for span annotations.
 * The filter state is synced with the URL, so it can be shared via URL and is preserved on page reload.
 *
 * @param routeApi reads and writes the URL search params, it can be obtained via useRouteApi().
 */
export const SpanAnnotationURLFilterTable = memo(
  ({
    routeApi,
    renderTopLeftToolbar = URLFilterTableToolbarLeft,
    ...tableProps
  }: URLFilterTableProps<SpanAnnotationRow, SpanColumns>) => {
    const [filter] = useURLConnector(routeApi, FILTER_PARAM);
    const tableInfoOptions = useMemo(
      () => spanAnnotationQueries.tableInfo(tableProps.projectId),
      [tableProps.projectId],
    );

    return (
      <SpanAnnotationFilterTable
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
 * Local filter table for span annotations.
 * The filter state is owned by the caller and passed via props, so it can be stored anywhere.
 */
export const SpanAnnotationLocalFilterTable = memo(
  ({
    filterName,
    filter,
    onFilterChange,
    expertMode,
    onExpertModeChange,
    renderTopLeftToolbar = LocalFilterTableToolbarLeft,
    ...tableProps
  }: LocalFilterTableProps<SpanAnnotationRow, SpanColumns>) => {
    const tableInfoOptions = spanAnnotationQueries.tableInfo(tableProps.projectId);

    return (
      <SpanAnnotationFilterTable
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
