import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import parse from "html-react-parser";
import {
  MRT_ColumnDef,
  MRT_GlobalFilterTextField,
  MRT_LinearProgressBar,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_TableContainer,
  MRT_ToggleDensePaddingButton,
  MRT_ToolbarAlertBanner,
  useMaterialReactTable,
} from "material-react-table";
import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FolderMap } from "../../../api/FolderHooks.ts";
import { QueryKey } from "../../../api/QueryKey.ts";
import { FolderType } from "../../../api/openapi/models/FolderType.ts";
import { HierarchicalElasticSearchHit } from "../../../api/openapi/models/HierarchicalElasticSearchHit.ts";
import { PaginatedSDocHits } from "../../../api/openapi/models/PaginatedSDocHits.ts";
import { SdocColumns } from "../../../api/openapi/models/SdocColumns.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { SourceDocumentRead } from "../../../api/openapi/models/SourceDocumentRead.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import { Draggable } from "../../../components/DnD/Draggable.tsx";
import DocumentUploadButton from "../../../components/DocumentUpload/DocumentUploadButton.tsx";
import NoDocumentsPlaceholder from "../../../components/DocumentUpload/NoDocumentsPlaceholder.tsx";
import ExportSdocsButton from "../../../components/Export/ExportSdocsButton.tsx";
import ReduxFilterDialog from "../../../components/FilterDialog/ReduxFilterDialog.tsx";
import { MyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import FolderRenderer from "../../../components/Folder/FolderRenderer.tsx";
import LLMAssistanceButton from "../../../components/LLMDialog/LLMAssistanceButton.tsx";
import CardContainer from "../../../components/MUI/CardContainer.tsx";
import DATSToolbar from "../../../components/MUI/DATSToolbar.tsx";
import SdocMetadataRenderer from "../../../components/Metadata/SdocMetadataRenderer.tsx";
import DeleteSdocsButton from "../../../components/SourceDocument/DeleteSdocsButton.tsx";
import SdocAnnotatorsRenderer from "../../../components/SourceDocument/SdocAnnotatorsRenderer.tsx";
import SdocRenderer from "../../../components/SourceDocument/SdocRenderer.tsx";
import SdocTagsRenderer from "../../../components/SourceDocument/SdocTagRenderer.tsx";
import TagMenuButton from "../../../components/Tag/TagMenu/TagMenuButton.tsx";
import { selectSelectedDocumentIds } from "../../../components/tableSlice.ts";
import queryClient from "../../../plugins/ReactQueryClient.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { useReduxConnector } from "../../../utils/useReduxConnector.ts";
import { useTableFetchMoreOnScroll, useTransformInfiniteData } from "../../../utils/useTableInfiniteScroll.ts";
import { useInitSearchFilterSlice } from "../useInitSearchFilterSlice.ts";
import OpenInTabsButton from "./OpenInTabsButton.tsx";
import SearchOptionsMenu from "./SearchOptionsMenu.tsx";
import { SearchActions } from "./searchSlice.ts";

// this has to match Search.tsx!
const filterStateSelector = (state: RootState) => state.search;
const filterName = "root";

const flatMapData = (page: PaginatedSDocHits) => page.hits;
const lengthData = (hits: HierarchicalElasticSearchHit[]) => hits.reduce((acc, hit) => acc + hit.sub_rows.length, 0);

interface DocumentTableProps {
  projectId: number;
  onSearchResultsChange?: (sdocIds: number[]) => void;
}

function SearchDocumentTable({ projectId, onSearchResultsChange }: DocumentTableProps) {
  const navigate = useNavigate();

  // global client state (react router)
  const { user } = useAuth();

  // global client state (redux) connected to table state
  const [searchQuery, setSearchQuery] = useReduxConnector(
    (state) => state.search.searchQuery,
    SearchActions.onSearchQueryChange,
  );
  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.search.rowSelectionModel,
    SearchActions.onRowSelectionChange,
  );
  const [sortingModel, setSortingModel] = useReduxConnector(
    (state) => state.search.sortingModel,
    SearchActions.onSortChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.search.columnVisibilityModel,
    SearchActions.onColumnVisibilityChange,
  );
  const [columnSizingModel, setColumnSizingModel] = useReduxConnector(
    (state) => state.search.columnSizingModel,
    SearchActions.onColumnSizingChange,
  );
  const [gridDensity, setGridDensityModel] = useReduxConnector(
    (state) => state.search.gridDensityModel,
    SearchActions.onGridDensityChange,
  );
  const selectedDocumentId = useAppSelector((state) => state.search.selectedDocumentId);
  const dispatch = useAppDispatch();
  const selectedDocumentIds = useAppSelector((state) => selectSelectedDocumentIds(state.search));

  // virtualization
  const toolbarRef = useRef<HTMLDivElement>(null);
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitSearchFilterSlice({ projectId });
  const columns = useMemo(() => {
    if (!tableInfo || !user) return [];

    const result = tableInfo.map((column) => {
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
            size: 100,
            Cell: ({ row }) =>
              row.original.is_folder ? (
                <Draggable id={`sdoc-folder-${row.original.id}`} data={row.original} Element="span">
                  <FolderRenderer folder={row.original.id} folderType={FolderType.SDOC_FOLDER} renderIcon />
                </Draggable>
              ) : (
                <SdocRenderer sdoc={row.original.id} renderDoctypeIcon />
              ),
          } as MRT_ColumnDef<HierarchicalElasticSearchHit>;
        case SdocColumns.SD_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            size: 360,
            Cell: ({ row }) =>
              row.original.is_folder ? (
                <FolderRenderer folder={row.original.id} folderType={FolderType.SDOC_FOLDER} renderName />
              ) : (
                <SdocRenderer sdoc={row.original.id} renderFilename />
              ),
          } as MRT_ColumnDef<HierarchicalElasticSearchHit>;
        case SdocColumns.SD_TAG_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => (row.original.is_folder ? null : <SdocTagsRenderer sdocId={row.original.id} />),
          } as MRT_ColumnDef<HierarchicalElasticSearchHit>;
        case SdocColumns.SD_USER_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => (row.original.is_folder ? null : <SdocAnnotatorsRenderer sdocId={row.original.id} />),
          } as MRT_ColumnDef<HierarchicalElasticSearchHit>;
        case SdocColumns.SD_CODE_ID_LIST:
          return null;
        case SdocColumns.SD_SPAN_ANNOTATIONS:
          return null;
        default:
          // render metadata
          if (!isNaN(parseInt(column.column))) {
            return {
              ...colDef,
              Cell: ({ row }) =>
                row.original.is_folder ? null : (
                  <SdocMetadataRenderer sdocId={row.original.id} projectMetadataId={parseInt(column.column)} />
                ),
            } as MRT_ColumnDef<HierarchicalElasticSearchHit>;
          } else {
            return {
              ...colDef,
              Cell: () => <i>Cannot render column {column.column}</i>,
            } as MRT_ColumnDef<HierarchicalElasticSearchHit>;
          }
      }
    });

    // unwanted columns are set to null, so we filter those out
    return result.filter((column) => column !== null) as MRT_ColumnDef<HierarchicalElasticSearchHit>[];
  }, [tableInfo, user]);

  // search
  const fetchSize = useAppSelector((state) => state.search.fetchSize);
  const filter = useAppSelector((state) => state.search.filter[filterName]);
  const { data, fetchNextPage, isError, isFetching, isLoading } = useInfiniteQuery<PaginatedSDocHits>({
    queryKey: [
      QueryKey.SEARCH_TABLE,
      projectId,
      searchQuery, // refetch when searchQuery changes
      filter, // refetch when columnFilters changes
      sortingModel, // refetch when sorting changes
      fetchSize,
    ],
    queryFn: async ({ pageParam }) => {
      const data = await SearchService.searchSdocs({
        searchQuery: searchQuery || "",
        projectId: projectId!,
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
      });

      // initialize the query cache
      console.log("Initializing sdoc query cache");
      Object.entries(data.sdocs).forEach(([sdocId, sdoc]) => {
        queryClient.setQueryData<SourceDocumentRead>([QueryKey.SDOC, parseInt(sdocId)], sdoc);
        queryClient.setQueryData<number>([QueryKey.SDOC_ID, projectId, sdoc.filename], sdoc.id);
      });

      console.log("Initializing annotators query cache");
      Object.entries(data.annotators).forEach(([sdocId, annotators]) => {
        queryClient.setQueryData<number[]>([QueryKey.SDOC_ANNOTATORS, parseInt(sdocId)], annotators);
      });

      console.log("Initializing tags query cache");
      Object.entries(data.tags).forEach(([sdocId, tags]) => {
        queryClient.setQueryData<number[]>([QueryKey.SDOC_TAGS, parseInt(sdocId)], tags);
      });

      console.log("Initializing sdocs folder query cache");
      queryClient.setQueryData<FolderMap>([QueryKey.PROJECT_FOLDERS, projectId, FolderType.SDOC_FOLDER], (prev) => {
        prev = prev || {};
        Object.entries(data.sdoc_folders).forEach(([folderId, folder]) => {
          prev[parseInt(folderId)] = folder;
        });
        return prev;
      });

      return data;
    },
    initialPageParam: 0,
    enabled: !!projectId,
    getNextPageParam: (_lastGroup, groups) => {
      return groups.length;
    },
    refetchOnWindowFocus: false,
  });
  const { flatData, totalFetched, totalResults } = useTransformInfiniteData({
    data,
    flatMapData,
    lengthData,
  });

  useEffect(() => {
    onSearchResultsChange?.(flatData.map((sdoc) => sdoc.id));
  }, [onSearchResultsChange, flatData]);

  // table
  const table = useMaterialReactTable<HierarchicalElasticSearchHit>({
    data: flatData,
    columns: columns,
    getRowId: (row) => (row.is_folder ? `folder-${row.id}` : `${row.id}`),
    // sub rows / folders
    enableExpanding: true,
    getSubRows: (originalRow) => originalRow.sub_rows, //default, can customize
    rowCount: totalResults,
    // state
    state: {
      globalFilter: searchQuery,
      rowSelection: rowSelectionModel,
      sorting: sortingModel,
      columnVisibility: columnVisibilityModel,
      columnSizing: columnSizingModel,
      density: gridDensity,
      isLoading: isLoading || columns.length === 0,
      showAlertBanner: isError,
      showProgressBars: isFetching,
      showGlobalFilter: true,
    },
    // search query
    autoResetAll: false,
    manualFiltering: true, // turn of client-side filtering
    // enableGlobalFilter: true,
    onGlobalFilterChange: setSearchQuery,
    // selection
    enableRowSelection: (row) => !row.original.is_folder, // disable selection for folders
    onRowSelectionChange: setRowSelectionModel,
    // virtualization
    enableRowVirtualization: true,
    rowVirtualizerInstanceRef: rowVirtualizerInstanceRef,
    rowVirtualizerOptions: { overscan: 4 },
    // filtering
    enableColumnFilters: false,
    // pagination
    enablePagination: false,
    // sorting
    manualSorting: false,
    onSortingChange: setSortingModel,
    // density
    onDensityChange: setGridDensityModel,
    // column visiblility
    onColumnVisibilityChange: setColumnVisibilityModel,
    // column resizing
    enableColumnResizing: true,
    columnResizeMode: "onEnd",
    onColumnSizingChange: setColumnSizingModel,
    // detail (highlights)
    renderDetailPanel:
      searchQuery && searchQuery.trim().length > 0 && flatData.length > 0
        ? ({ row }) =>
            !row.original.is_folder && row.original.highlights ? (
              <Box className="search-result-highlight">
                {row.original.highlights.map((highlight, index) => (
                  <Typography key={`sdoc-${row.original.id}-highlight-${index}`} m={0.5}>
                    {parse(highlight)}
                  </Typography>
                ))}
              </Box>
            ) : null
        : undefined,
    // mui components
    muiTableBodyRowProps: ({ row }) =>
      row.original.is_folder
        ? {}
        : {
            onClick: (event) => {
              if (event.detail >= 2) {
                navigate(`/project/${projectId}/annotation/${row.original.id}`);
              } else {
                dispatch(SearchActions.onToggleSelectedDocumentIdChange(row.original.id));
              }
            },
            sx: {
              backgroundColor: selectedDocumentId === row.original.id ? "lightgrey !important" : undefined,
            },
          },
    renderEmptyRowsFallback: filter.items.length === 0 ? () => <NoDocumentsPlaceholder /> : undefined,
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : { style: { width: "100%", padding: 0 }, className: "fixAlertBanner" },
    // toolbar
    positionToolbarAlertBanner: "none",
  });

  // infinite scrolling
  // fetch more
  const fetchMoreOnScroll = useTableFetchMoreOnScroll({
    tableContainerRef: table.refs.tableContainerRef,
    isFetching,
    fetchNextPage,
    totalFetched,
    totalResults,
  });
  // reset
  useEffect(() => {
    try {
      rowVirtualizerInstanceRef.current?.scrollToIndex?.(0);
    } catch (error) {
      console.error(error);
    }
  }, [projectId, searchQuery, filter, sortingModel]);

  // Track & restore scroll position
  const savedScrollPosition = useAppSelector((state) => state.search.scrollPosition);
  useEffect(() => {
    if (
      table.refs.tableContainerRef.current &&
      table.refs.tableContainerRef.current?.scrollTop !== savedScrollPosition
    ) {
      console.log("Restoring scroll position: ", savedScrollPosition);
      setTimeout(() => {
        table.refs.tableContainerRef.current!.scrollTop = savedScrollPosition;
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <DATSToolbar variant="dense" ref={toolbarRef}>
        <ReduxFilterDialog
          anchorEl={toolbarRef.current}
          buttonProps={{ size: "small" }}
          filterName={filterName}
          filterStateSelector={filterStateSelector}
          filterActions={SearchActions}
          transformOrigin={{ horizontal: "left", vertical: "top" }}
          anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
        />
        {selectedDocumentIds.length > 0 && (
          <>
            <TagMenuButton
              selectedSdocIds={selectedDocumentIds}
              popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
            />
            <DeleteSdocsButton sdocIds={selectedDocumentIds} navigateTo="../search" />
            <LLMAssistanceButton sdocIds={selectedDocumentIds} projectId={projectId} />
            <OpenInTabsButton sdocIds={selectedDocumentIds} projectId={projectId} />
          </>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <MRT_GlobalFilterTextField table={table} />
        <SearchOptionsMenu />
        <DocumentUploadButton />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
        <ExportSdocsButton sdocIds={selectedDocumentIds} />
        <MRT_LinearProgressBar isTopToolbar={true} table={table} />
      </DATSToolbar>
      <MRT_ToolbarAlertBanner stackAlertBanner table={table} />
      <CardContainer sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <MRT_TableContainer
          table={table}
          style={{ flexGrow: 1 }}
          onScroll={(event) => {
            // Save the scroll position when the user scrolls
            const target = event.target as HTMLDivElement;
            dispatch(SearchActions.onSaveScrollPosition(target.scrollTop));
            // Continue with the default fetch more behavior
            fetchMoreOnScroll(target);
          }}
        />
        <Box sx={{ p: 1 }}>
          <Divider />
          <Stack direction="row" alignItems="top" pt={0.5}>
            <Typography variant="body2" color="textSecondary" pt={0.5} mr={1}>
              Fetched {totalFetched} of {totalResults} documents
            </Typography>
            <Button size="small" onClick={() => dispatch(SearchActions.onFetchSizeChange(totalResults))}>
              Fetch All
            </Button>
          </Stack>
        </Box>
      </CardContainer>
    </Box>
  );
}

export default SearchDocumentTable;
