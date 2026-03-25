import { QueryKey } from "@api/hooks/QueryKey";
import { AttachedObjectType } from "@api/models/AttachedObjectType";
import { SentAnnoColumns } from "@api/models/SentAnnoColumns";
import { SentenceAnnotationRow } from "@api/models/SentenceAnnotationRow";
import { SentenceAnnotationSearchResult } from "@api/models/SentenceAnnotationSearchResult";
import { SortDirection } from "@api/models/SortDirection";
import { SearchService } from "@api/services/SearchService";
import { useAuth } from "@core/auth";
import { CodeRenderer } from "@core/code";
import {
  FILTER_PARAM,
  FilterTable,
  FilterTableContainerProps,
  FilterTableToolbarProps,
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
import { MemoRenderer2 } from "@core/memo";
import { SdocMetadataRenderer } from "@core/sdoc-metadata";
import { SdocTagsRenderer } from "@core/source-document";
import { UserRenderer } from "@core/user";
import { useURLConnector } from "@hooks/useURLConnector";
import { RootState } from "@store/store";
import { useAppSelector } from "@store/storeHooks";
import { useInfiniteQuery } from "@tanstack/react-query";
import { MRT_ColumnDef } from "material-react-table";
import { memo, useMemo } from "react";
import { SdocAnnotationLink } from "./_components/SdocAnnotationLink";
import { useInitSEATFilterSlice } from "./_hooks/useInitSEATFilterSlice";
import { SEATFilterActions, defaultSEATFilterExpression } from "./seatFilterSlice";

const flatMapData = (page: SentenceAnnotationSearchResult) => page.data;

/**
 * Component for rendering a filter table for sentence annotations.
 * The filter state can be managed either via Redux or via URL search params, which is determined by the parent component (SentenceAnnotationReduxFilterTable or SentenceAnnotationURLFilterTable).
 * It defines the columns and how to fetch the data, while the actual filter state management is delegated to the parent component.
 *
 * @param filter the filter state, which is either obtained from Redux or from URL search params, depending on the parent component
 * @param renderTopLeftToolbar the function to render the top left toolbar, which is either the ReduxFilterTableToolbarLeft or the URLFilterTableToolbarLeft, depending on the parent component
 * @param toolbarExtraProps the extra props to pass to the toolbar, which contains the necessary information for managing the filter state (either Redux or URL)
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
  positionToolbarAlertBanner = "top",
  renderTopRightToolbar,
  renderTopLeftToolbar,
  renderBottomToolbar,
  toolbarExtraProps,
}: FilterTableContainerProps<SentenceAnnotationRow, TToolbarProps, MyFilter<SentAnnoColumns>>) => {
  const { user } = useAuth();
  const userId = user?.id;

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
        default:
          if (!isNaN(parseInt(column.column))) {
            return {
              ...colDef,
              accessorFn: () => null,
              Cell: ({ row }) => (
                <SdocMetadataRenderer sdocId={row.original.sdoc.id} projectMetadataId={parseInt(column.column)} />
              ),
            } as MRT_ColumnDef<SentenceAnnotationRow>;
          }
          return {
            ...colDef,
            accessorFn: () => null,
            Cell: () => <i>Cannot render column {column.column}</i>,
          } as MRT_ColumnDef<SentenceAnnotationRow>;
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
    queryKey: [QueryKey.SENT_ANNO_TABLE, projectId, filter, sortingModel, fetchSize],
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
    getNextPageParam: (_lastGroup, groups) => groups.length,
    refetchOnWindowFocus: false,
  });

  return (
    <FilterTable
      name="sentence annotations"
      columns={columns}
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
const filterStateSelector = (state: RootState) => state.seatFilter;
const filterActions = SEATFilterActions;

/**
 * Redux-based filter table for sentence annotations.
 * The filter state is stored under state.seatFilter.filter[filterName].
 *
 * @param filterName used to identify the filter state in the redux store, so that multiple tables can be used without conflicts.
 */
export const SentenceAnnotationReduxFilterTable = memo(
  ({
    filterName,
    ...tableProps
  }: Omit<
    FilterTableContainerProps<
      SentenceAnnotationRow,
      ReduxFilterTableToolbarProps<SentenceAnnotationRow>,
      MyFilter<SentAnnoColumns>
    >,
    "filter" | "renderTopLeftToolbar" | "toolbarExtraProps"
  > &
    Omit<ReduxFilterDialogProps, "filterActions" | "filterStateSelector">) => {
    const filter =
      useAppSelector((state) => filterStateSelector(state).filter[filterName]) || createEmptyFilter(filterName);

    return (
      <SentenceAnnotationFilterTable
        {...tableProps}
        filter={filter as MyFilter<SentAnnoColumns>}
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
const column2InfoSelector = (state: RootState) => state.seatFilter.column2Info;
const defaultFilterExpression = defaultSEATFilterExpression;
const urlFilterName = "root";

/**
 * URL-based filter table for sentence annotations.
 * The filter state is synced with the URL, so it can be shared via URL and is preserved on page reload.
 *
 * @param routeApi used to read and write the URL search params, it can be obtained via useRouteApi().
 */
export const SentenceAnnotationURLFilterTable = memo(
  ({
    routeApi,
    renderTopLeftToolbar = URLFilterTableToolbarLeft,
    ...tableProps
  }: Omit<
    FilterTableContainerProps<
      SentenceAnnotationRow,
      URLFilterTableToolbarProps<SentenceAnnotationRow>,
      MyFilter<SentAnnoColumns>
    >,
    "filter" | "toolbarExtraProps"
  > &
    Omit<URLFilterDialogProps, "column2InfoSelector" | "defaultFilterExpression" | "filterName">) => {
    const [serializedFilter] = useURLConnector(routeApi, FILTER_PARAM);
    const filter = useMemo(
      () => deserializeFilterFromSearchParam(serializedFilter, urlFilterName) as MyFilter<SentAnnoColumns>,
      [serializedFilter],
    );

    return (
      <SentenceAnnotationFilterTable
        {...tableProps}
        filter={filter}
        renderTopLeftToolbar={renderTopLeftToolbar}
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
