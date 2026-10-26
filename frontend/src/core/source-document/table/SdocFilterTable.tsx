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
import { SdocMetadataRenderer } from "@core/sdoc-metadata";
import { useResetStateOnSearch } from "@hooks/useResetStateOnSearch";
import { useURLConnector } from "@hooks/useURLConnector";
import { HierarchicalElasticSearchHit } from "@models/HierarchicalElasticSearchHit";
import { PaginatedSDocHits } from "@models/PaginatedSDocHits";
import { SdocColumns } from "@models/SdocColumns";
import { Box, Typography } from "@mui/material";
import { RootState } from "@store/store";
import { useAppSelector } from "@store/storeHooks";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import parse from "html-react-parser";
import { MRT_ColumnDef } from "material-react-table";
import { memo, useCallback, useMemo, useState } from "react";
import { sdocQueries } from "../api/sdocQueries";
import { SdocAnnotatorsRenderer, SdocFolderRenderer, SdocRenderer, SdocTagsRenderer } from "../renderer";
import { defaultSdocFilterExpression, SdocFilterActions } from "./sdocFilterSlice";

const flatMapData = (page: PaginatedSDocHits) => page.hits;

// columns that the table does not show
const HIDDEN_COLUMNS: string[] = [SdocColumns.SD_CODE_ID_LIST_RECURSIVE, SdocColumns.SD_SPAN_ANNOTATIONS];

/**
 * Filter table for source documents: defines the columns and fetches the data.
 * Where the filter lives (Redux, URL or the caller) is decided by the variants below, which pass the filter and the
 * matching top left toolbar.
 */
const SdocFilterTable = <TToolbarProps extends FilterTableToolbarProps<HierarchicalElasticSearchHit>>({
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
}: FilterTableContainerProps<HierarchicalElasticSearchHit, TToolbarProps, MyFilter<SdocColumns>>) => {
  const [searchQuery, setSearchQuery] = useState<string | undefined>("");

  // table columns
  const { data: tableInfo } = useQuery(sdocQueries.tableInfo(projectId));
  const columns = useMemo(() => {
    if (!tableInfo) return [];

    return tableInfo
      .filter((column) => !HIDDEN_COLUMNS.includes(column.column))
      .map((column): MRT_ColumnDef<HierarchicalElasticSearchHit> => {
        const colDef: MRT_ColumnDef<HierarchicalElasticSearchHit> = {
          id: column.column,
          accessorFn: () => null,
          header: column.label,
          enableSorting: column.sortable,
        };

        switch (column.column) {
          case SdocColumns.SD_SOURCE_DOCUMENT_TYPE:
            return {
              ...colDef,
              Cell: ({ row }) => <SdocRenderer sdoc={row.original.id} renderDoctypeIcon />,
            };
          case SdocColumns.SD_SOURCE_DOCUMENT_NAME:
            return {
              ...colDef,
              Cell: ({ row }) => <SdocRenderer sdoc={row.original.id} renderName />,
            };
          case SdocColumns.SD_TAG_ID_LIST_RECURSIVE:
            return {
              ...colDef,
              Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.id} />,
            };
          case SdocColumns.SD_USER_ID_LIST:
            return {
              ...colDef,
              Cell: ({ row }) => <SdocAnnotatorsRenderer sdocId={row.original.id} />,
            };
          case SdocColumns.SD_FOLDER_ID_LIST_RECURSIVE:
            return {
              ...colDef,
              Cell: ({ row }) => <SdocFolderRenderer sdocId={row.original.id} renderName renderIcon />,
            };
          default:
            if (!isNaN(parseInt(column.column))) {
              return {
                ...colDef,
                Cell: ({ row }) => (
                  <SdocMetadataRenderer sdocId={row.original.id} projectMetadataId={parseInt(column.column)} />
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
    sdocQueries.search({
      projectId,
      searchQuery: searchQuery || "",
      requestBody: { filter, sorts: toSorts<SdocColumns>(sortingModel) },
      pageSize: fetchSize,
      expertMode: false,
      showFolders: false,
    }),
  );

  // resetting search-parameter-dependant state
  const resetState = useCallback(() => {
    onRowSelectionChange?.({});
    onFetchSizeChange(20);
    onSearchParameterChange?.();
  }, [onRowSelectionChange, onFetchSizeChange, onSearchParameterChange]);
  useResetStateOnSearch([searchQuery, filter, sortingModel], resetState);

  // search highlights
  const renderDetailPanel = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length === 0) return undefined;

    return ({ row }: { row: { original: HierarchicalElasticSearchHit } }) =>
      row.original.highlights ? (
        <Box className="search-result-highlight">
          {row.original.highlights.map((highlight, index) => (
            <Typography key={`sdoc-${row.original.id}-highlight-${index}`} m={0.5}>
              {parse(highlight)}
            </Typography>
          ))}
        </Box>
      ) : null;
  }, [searchQuery]);

  return (
    <FilterTable
      name="documents"
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
      state={{ globalFilter: searchQuery }}
      enableGlobalFilter
      onGlobalFilterChange={setSearchQuery}
      renderDetailPanel={renderDetailPanel}
    />
  );
};

// configs for redux filter table
const filterStateSelector = (state: RootState) => state.sdocFilter;
const filterActions = SdocFilterActions;

/**
 * Redux-based filter table for source documents.
 * The filter state is stored under state.sdocFilter.filter[filterName].
 *
 * @param filterName identifies the filter in the redux store, so that multiple tables can be used without conflicts.
 */
export const SdocReduxFilterTable = memo(
  ({
    filterName,
    renderTopLeftToolbar = ReduxFilterTableToolbarLeft,
    ...tableProps
  }: ReduxFilterTableProps<HierarchicalElasticSearchHit, SdocColumns>) => {
    const reduxFilter = useAppSelector((state) => filterStateSelector(state).filter[filterName]);
    const filter = useMemo(() => reduxFilter || createEmptyFilter(filterName), [reduxFilter, filterName]);
    // keeps its identity, so that the memoized filter popover does not re-render with every render of the table
    const tableInfoOptions = useMemo(() => sdocQueries.tableInfo(tableProps.projectId), [tableProps.projectId]);

    return (
      <SdocFilterTable
        {...tableProps}
        filter={filter as MyFilter<SdocColumns>}
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
const defaultFilterExpression = defaultSdocFilterExpression;

/**
 * URL-based filter table for source documents.
 * The filter state is synced with the URL, so it can be shared via URL and is preserved on page reload.
 *
 * @param routeApi reads and writes the URL search params, it can be obtained via useRouteApi().
 */
export const SdocURLFilterTable = memo(
  ({
    routeApi,
    renderTopLeftToolbar = URLFilterTableToolbarLeft,
    ...tableProps
  }: URLFilterTableProps<HierarchicalElasticSearchHit, SdocColumns>) => {
    const [filter] = useURLConnector(routeApi, FILTER_PARAM);
    // keeps its identity, so that the memoized filter popover does not re-render with every render of the table
    const tableInfoOptions = useMemo(() => sdocQueries.tableInfo(tableProps.projectId), [tableProps.projectId]);

    return (
      <SdocFilterTable
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
 * Local filter table for source documents.
 * The filter state is owned by the caller and passed via props, so it can be stored anywhere.
 */
export const SdocLocalFilterTable = memo(
  ({
    filterName,
    filter,
    onFilterChange,
    expertMode,
    onExpertModeChange,
    renderTopLeftToolbar = LocalFilterTableToolbarLeft,
    ...tableProps
  }: LocalFilterTableProps<HierarchicalElasticSearchHit, SdocColumns>) => {
    const column2Info = TableInfoHooks.useColumnInfoMap(sdocQueries.tableInfo(tableProps.projectId));

    return (
      <SdocFilterTable
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
