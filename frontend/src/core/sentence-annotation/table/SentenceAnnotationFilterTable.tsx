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
  TableInfoHooks,
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
import { Page_SentenceAnnotationRow_ } from "@models/Page_SentenceAnnotationRow_";
import { SentAnnoColumns } from "@models/SentAnnoColumns";
import { SentenceAnnotationRow } from "@models/SentenceAnnotationRow";
import { RootState } from "@store/store";
import { useAppSelector } from "@store/storeHooks";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { MRT_ColumnDef } from "material-react-table";
import { memo, useCallback, useMemo } from "react";
import { sentenceAnnotationQueries } from "../api/sentenceAnnotationQueries";
import { SdocAnnotationLink } from "./_components/SdocAnnotationLink";
import { defaultSEATFilterExpression, SEATFilterActions } from "./seatFilterSlice";

const flatMapData = (page: Page_SentenceAnnotationRow_) => page.items;

/**
 * Filter table for sentence annotations: defines the columns and fetches the data.
 * Where the filter lives (Redux, URL or the caller) is decided by the variants below, which pass the filter and the
 * matching top left toolbar.
 */
const SentenceAnnotationFilterTable = <TToolbarProps extends FilterTableToolbarProps<SentenceAnnotationRow>>({
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
}: FilterTableContainerProps<SentenceAnnotationRow, TToolbarProps, MyFilter<SentAnnoColumns>>) => {
  // table columns
  const { data: tableInfo } = useQuery(sentenceAnnotationQueries.tableInfo(projectId));
  const columns = useMemo(() => {
    if (!tableInfo) return [];

    // custom columns
    const textColumn: MRT_ColumnDef<SentenceAnnotationRow> = {
      id: "text",
      header: "Annotated Sentences",
      enableSorting: false,
      accessorFn: (row) => row.text,
    };

    const result = tableInfo.map((column): MRT_ColumnDef<SentenceAnnotationRow> => {
      const colDef: MRT_ColumnDef<SentenceAnnotationRow> = {
        id: column.column,
        accessorFn: () => null,
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case SentAnnoColumns.SENT_ANNO_SOURCE_SOURCE_DOCUMENT_NAME:
          return {
            ...colDef,
            accessorFn: (row) => row.sdoc.name,
            Cell: ({ row }) => <SdocAnnotationLink sdoc={row.original.sdoc} annotation={row.original} />,
          };
        case SentAnnoColumns.SENT_ANNO_TAG_ID_LIST_RECURSIVE:
          return {
            ...colDef,
            accessorFn: (row) => row.tag_ids,
            Cell: ({ row }) => <SdocTagsRenderer tagIds={row.original.tag_ids} />,
          };
        case SentAnnoColumns.SENT_ANNO_CODE_ID_LIST_RECURSIVE:
          return {
            ...colDef,
            accessorFn: (row) => row.code,
            Cell: ({ row }) => <CodeRenderer code={row.original.code} renderMemoIndicator />,
          };
        case SentAnnoColumns.SENT_ANNO_USER_ID:
          return {
            ...colDef,
            accessorFn: (row) => row.user_id,
            Cell: ({ row }) => <UserRenderer user={row.original.user_id} />,
          };
        case SentAnnoColumns.SENT_ANNO_MEMO_CONTENT:
          return {
            ...colDef,
            Cell: ({ row }) => (
              <MemoIndicator
                memoIds={row.original.memo_ids}
                attachedObjectType={AttachedObjectType.SENTENCE_ANNOTATION}
                attachedObjectId={row.original.id}
              />
            ),
          };
        case SentAnnoColumns.SENT_ANNO_FOLDER_ID_LIST_RECURSIVE:
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

    return [textColumn, ...result];
  }, [tableInfo]);

  // table data
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery(
    sentenceAnnotationQueries.search({
      project_id: projectId,
      filter,
      sorts: toSorts<SentAnnoColumns>(sortingModel),
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
      name="sentence annotations"
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
const filterStateSelector = (state: RootState) => state.seatFilter;
const filterActions = SEATFilterActions;

/**
 * Redux-based filter table for sentence annotations.
 * The filter state is stored under state.seatFilter.filter[filterName].
 *
 * @param filterName identifies the filter in the redux store, so that multiple tables can be used without conflicts.
 */
export const SentenceAnnotationReduxFilterTable = memo(
  ({
    filterName,
    renderTopLeftToolbar = ReduxFilterTableToolbarLeft,
    ...tableProps
  }: ReduxFilterTableProps<SentenceAnnotationRow, SentAnnoColumns>) => {
    const reduxFilter = useAppSelector((state) => filterStateSelector(state).filter[filterName]);
    const filter = useMemo(() => reduxFilter || createEmptyFilter(filterName), [reduxFilter, filterName]);
    // keeps its identity, so that the memoized filter dialog does not re-render with every render of the table
    const tableInfoOptions = useMemo(
      () => sentenceAnnotationQueries.tableInfo(tableProps.projectId),
      [tableProps.projectId],
    );

    return (
      <SentenceAnnotationFilterTable
        {...tableProps}
        filter={filter as MyFilter<SentAnnoColumns>}
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
const defaultFilterExpression = defaultSEATFilterExpression;

/**
 * URL-based filter table for sentence annotations.
 * The filter state is synced with the URL, so it can be shared via URL and is preserved on page reload.
 *
 * @param routeApi reads and writes the URL search params, it can be obtained via useRouteApi().
 */
export const SentenceAnnotationURLFilterTable = memo(
  ({
    routeApi,
    renderTopLeftToolbar = URLFilterTableToolbarLeft,
    ...tableProps
  }: URLFilterTableProps<SentenceAnnotationRow, SentAnnoColumns>) => {
    const [filter] = useURLConnector(routeApi, FILTER_PARAM);
    // keeps its identity, so that the memoized filter dialog does not re-render with every render of the table
    const tableInfoOptions = useMemo(
      () => sentenceAnnotationQueries.tableInfo(tableProps.projectId),
      [tableProps.projectId],
    );

    return (
      <SentenceAnnotationFilterTable
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
 * Local filter table for sentence annotations.
 * The filter state is owned by the caller and passed via props, so it can be stored anywhere.
 */
export const SentenceAnnotationLocalFilterTable = memo(
  ({
    filterName,
    filter,
    onFilterChange,
    expertMode,
    onExpertModeChange,
    renderTopLeftToolbar = LocalFilterTableToolbarLeft,
    ...tableProps
  }: LocalFilterTableProps<SentenceAnnotationRow, SentAnnoColumns>) => {
    const column2Info = TableInfoHooks.useColumnInfoMap(sentenceAnnotationQueries.tableInfo(tableProps.projectId));

    return (
      <SentenceAnnotationFilterTable
        {...tableProps}
        filter={filter}
        renderTopLeftToolbar={renderTopLeftToolbar}
        toolbarExtraProps={{
          filterName,
          defaultFilterExpression,
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
