import { QueryKey } from "@api/hooks/QueryKey";
import { ElasticSearchHit } from "@api/models/ElasticSearchHit";
import { PaginatedElasticSearchHits } from "@api/models/PaginatedElasticSearchHits";
import { SdocColumns } from "@api/models/SdocColumns";
import { SortDirection } from "@api/models/SortDirection";
import { SearchService } from "@api/services/SearchService";
import {
  FILTER_PARAM,
  FilterTable,
  FilterTableContainerProps,
  FilterTableToolbarProps,
  FilterTableToolbarRight,
  MyFilter,
  ReduxFilterDialogProps,
  ReduxFilterTableToolbarLeft,
  ReduxFilterTableToolbarProps,
  URLFilterDialogProps,
  URLFilterTableToolbarLeft,
  URLFilterTableToolbarProps,
  createEmptyFilter,
  deserializeFilterFromSearchParam,
} from "@core/filter";
import { SdocMetadataRenderer } from "@core/sdoc-metadata";
import { useURLConnector } from "@hooks/useURLConnector";
import { Box, Typography } from "@mui/material";
import { RootState } from "@store/store";
import { useAppSelector } from "@store/storeHooks";
import { useInfiniteQuery } from "@tanstack/react-query";
import parse from "html-react-parser";
import { MRT_ColumnDef } from "material-react-table";
import { memo, useEffect, useMemo, useState } from "react";
import { SdocAnnotatorsRenderer, SdocRenderer, SdocTagsRenderer } from "../renderer";
import { useInitDocumentTableFilterSlice } from "./_hooks/useInitDocumentTableFilterSlice";
import { SdocTableFilterActions, defaultSdocFilterExpression } from "./sdocTableFilterSlice";

const flatMapData = (page: PaginatedElasticSearchHits) => page.hits;

/**
 * Component for rendering a filter table for source documents.
 * The filter state can be managed either via Redux or via URL search params, which is determined by the parent component.
 * It defines the columns and how to fetch the data, while the actual filter state management is delegated to the parent component.
 *
 * @param filter the filter state, which is either obtained from Redux or from URL search params, depending on the parent component
 * @param renderTopLeftToolbar the function to render the top left toolbar, which is either the ReduxFilterTableToolbarLeft or the URLFilterTableToolbarLeft, depending on the parent component
 * @param toolbarExtraProps the extra props to pass to the toolbar, which contains the necessary information for managing the filter state (either Redux or URL)
 */
const SdocFilterTable = <TToolbarProps extends FilterTableToolbarProps<ElasticSearchHit>>({
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
  renderTopRightToolbar = FilterTableToolbarRight,
  renderTopLeftToolbar,
  renderBottomToolbar,
  toolbarExtraProps,
}: FilterTableContainerProps<ElasticSearchHit, TToolbarProps, MyFilter<SdocColumns>>) => {
  const [searchQuery, setSearchQuery] = useState<string | undefined>("");

  const tableInfo = useInitDocumentTableFilterSlice({ projectId });
  const columns = useMemo(() => {
    if (!tableInfo) return [];

    const result = tableInfo.map((column) => {
      const colDef: MRT_ColumnDef<ElasticSearchHit> = {
        id: column.column,
        header: column.label,
        enableSorting: column.sortable,
      };
      switch (column.column) {
        case SdocColumns.SD_SOURCE_DOCUMENT_TYPE:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.id} renderDoctypeIcon />,
          } as MRT_ColumnDef<ElasticSearchHit>;
        case SdocColumns.SD_SOURCE_DOCUMENT_NAME:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.id} renderName />,
          } as MRT_ColumnDef<ElasticSearchHit>;
        case SdocColumns.SD_TAG_ID_LIST:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.id} />,
          } as MRT_ColumnDef<ElasticSearchHit>;
        case SdocColumns.SD_USER_ID_LIST:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocAnnotatorsRenderer sdocId={row.original.id} />,
          } as MRT_ColumnDef<ElasticSearchHit>;
        case SdocColumns.SD_CODE_ID_LIST:
          return null;
        case SdocColumns.SD_SPAN_ANNOTATIONS:
          return null;
        default:
          if (!isNaN(parseInt(column.column))) {
            return {
              ...colDef,
              flex: 2,
              Cell: ({ row }) => (
                <SdocMetadataRenderer sdocId={row.original.id} projectMetadataId={parseInt(column.column)} />
              ),
            } as MRT_ColumnDef<ElasticSearchHit>;
          }
          return {
            ...colDef,
            Cell: () => <i>Cannot render column {column.column}</i>,
          } as MRT_ColumnDef<ElasticSearchHit>;
      }
    });

    return result.filter((column) => column !== null) as MRT_ColumnDef<ElasticSearchHit>[];
  }, [tableInfo]);

  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<PaginatedElasticSearchHits>({
    queryKey: [QueryKey.SDOC_TABLE, projectId, searchQuery, filter, sortingModel, fetchSize],
    queryFn: ({ pageParam }) =>
      SearchService.searchSdocs({
        searchQuery: searchQuery || "",
        projectId: projectId!,
        folderId: null,
        highlight: true,
        expertMode: false,
        requestBody: {
          filter: filter as MyFilter<SdocColumns>,
          sorts: sortingModel.map((sort) => ({
            column: sort.id as SdocColumns,
            direction: sort.desc ? SortDirection.DESC : SortDirection.ASC,
          })),
        },
        pageNumber: pageParam as number,
        pageSize: fetchSize,
      }),
    initialPageParam: 0,
    getNextPageParam: (_lastGroup, groups) => groups.length,
    refetchOnWindowFocus: false,
  });

  // resetting search-parameter-dependant state
  useEffect(() => {
    onRowSelectionChange?.({});
    onFetchSizeChange?.(20);
    onSearchParameterChange?.();
  }, [searchQuery, filter, sortingModel, onRowSelectionChange, onFetchSizeChange, onSearchParameterChange]);

  const renderDetailPanel = useMemo(() => {
    if (!searchQuery || searchQuery.trim().length === 0) return undefined;

    return ({ row }: { row: { original: ElasticSearchHit } }) =>
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
      state={{ globalFilter: searchQuery }}
      enableGlobalFilter
      onGlobalFilterChange={setSearchQuery}
      renderDetailPanel={renderDetailPanel}
    />
  );
};

// configs for redux filter table
const filterStateSelector = (state: RootState) => state.documentTableFilter;
const filterActions = SdocTableFilterActions;

/**
 * Redux-based filter table for source documents.
 * The filter state is stored under state.documentTableFilter.filter[filterName].
 *
 * @param filterName used to identify the filter state in the redux store, so that multiple tables can be used without conflicts.
 */
export const SdocReduxFilterTable = memo(
  ({
    filterName,
    ...tableProps
  }: Omit<
    FilterTableContainerProps<ElasticSearchHit, ReduxFilterTableToolbarProps<ElasticSearchHit>, MyFilter<SdocColumns>>,
    "filter" | "renderTopLeftToolbar" | "toolbarExtraProps"
  > &
    Omit<ReduxFilterDialogProps, "filterActions" | "filterStateSelector">) => {
    const filter =
      useAppSelector((state) => filterStateSelector(state).filter[filterName]) || createEmptyFilter(filterName);

    return (
      <SdocFilterTable
        {...tableProps}
        filter={filter as MyFilter<SdocColumns>}
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
const column2InfoSelector = (state: RootState) => state.documentTableFilter.column2Info;
const defaultFilterExpression = defaultSdocFilterExpression;
const urlFilterName = "root";

/**
 * URL-based filter table for source documents.
 * The filter state is synced with the URL, so it can be shared via URL and is preserved on page reload.
 *
 * @param routeApi used to read and write the URL search params, it can be obtained via useRouteApi().
 */
export const SdocURLFilterTable = memo(
  ({
    routeApi,
    ...tableProps
  }: Omit<
    FilterTableContainerProps<ElasticSearchHit, URLFilterTableToolbarProps<ElasticSearchHit>, MyFilter<SdocColumns>>,
    "filter" | "renderTopLeftToolbar" | "toolbarExtraProps"
  > &
    Omit<URLFilterDialogProps, "column2InfoSelector" | "defaultFilterExpression" | "filterName">) => {
    const [serializedFilter] = useURLConnector(routeApi, FILTER_PARAM);
    const filter = useMemo(
      () => deserializeFilterFromSearchParam(serializedFilter, urlFilterName) as MyFilter<SdocColumns>,
      [serializedFilter],
    );

    return (
      <SdocFilterTable
        {...tableProps}
        filter={filter}
        renderTopLeftToolbar={URLFilterTableToolbarLeft}
        toolbarExtraProps={{
          filterName: urlFilterName,
          routeApi,
          defaultFilterExpression,
          column2InfoSelector,
        }}
      />
    );
  },
);
