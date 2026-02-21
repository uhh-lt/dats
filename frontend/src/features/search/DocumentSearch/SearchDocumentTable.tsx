import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import parse from "html-react-parser";
import {
  MRT_ColumnDef,
  MRT_GlobalFilterTextField,
  MRT_LinearProgressBar,
  MRT_Row,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_TableContainer,
  MRT_ToggleDensePaddingButton,
  MRT_ToolbarAlertBanner,
  MRT_Updater,
  useMaterialReactTable,
} from "material-react-table";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { FolderMap } from "../../../api/FolderHooks.ts";
import { QueryKey } from "../../../api/QueryKey.ts";
import { FolderType } from "../../../api/openapi/models/FolderType.ts";
import { HierarchicalElasticSearchHit } from "../../../api/openapi/models/HierarchicalElasticSearchHit.ts";
import { PaginatedSDocHits } from "../../../api/openapi/models/PaginatedSDocHits.ts";
import { SdocColumns } from "../../../api/openapi/models/SdocColumns.ts";
import { SortDirection } from "../../../api/openapi/models/SortDirection.ts";
import { SourceDocumentRead } from "../../../api/openapi/models/SourceDocumentRead.ts";
import { SearchService } from "../../../api/openapi/services/SearchService.ts";
import { ClassifierInferenceButton } from "../../../components/Classifier/ClassifierInferenceButton.tsx";
import { Draggable } from "../../../components/DnD/Draggable.tsx";
import { DocumentUploadButton } from "../../../components/DocumentUpload/DocumentUploadButton.tsx";
import { NoDocumentsPlaceholder } from "../../../components/DocumentUpload/NoDocumentsPlaceholder.tsx";
import { ExportSdocsButton } from "../../../components/Export/ExportSdocsButton.tsx";
import { ReduxFilterDialog } from "../../../components/FilterDialog/ReduxFilterDialog.tsx";
import { MyFilter } from "../../../components/FilterDialog/filterUtils.ts";
import { LLMAssistanceButton } from "../../../components/LLMDialog/LLMAssistanceButton.tsx";
import { CardContainer } from "../../../components/MUI/CardContainer.tsx";
import { DATSToolbar } from "../../../components/MUI/DATSToolbar.tsx";
import { FolderActionMenuButton } from "../../../core/folder/action-menu/FolderActionMenuButton.tsx";
import { FolderRenderer } from "../../../core/folder/renderer/FolderRenderer.tsx";
import { SdocMetadataRenderer } from "../../../core/sdoc-metadata/renderer/SdocMetadataRenderer.tsx";
import { DeleteSdocsButton } from "../../../core/source-document/DeleteSdocsButton.tsx";
import { SdocAnnotatorsRenderer } from "../../../core/source-document/SdocAnnotatorsRenderer.tsx";
import { SdocRenderer } from "../../../core/source-document/renderer/SdocRenderer.tsx";
import { SdocTagsRenderer } from "../../../core/source-document/renderer/SdocTagRenderer.tsx";
import { TagMenuButton } from "../../../core/tag/menu/TagMenuButton.tsx";
import { useReduxConnector } from "../../../hooks/useReduxConnector.ts";
import { useTableFetchMoreOnScroll } from "../../../hooks/useTableInfiniteScroll.ts";
import { queryClient } from "../../../plugins/ReactQueryClient.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { selectSelectedIds, selectSelectedRows } from "../../../store/tableSlice.ts";
import { useAuth } from "../../auth/useAuth.ts";
import { useInitSearchFilterSlice } from "../useInitSearchFilterSlice.ts";
import { OpenInTabsButton } from "./OpenInTabsButton.tsx";
import { SearchOptionsMenu } from "./SearchOptionsMenu.tsx";
import { FolderSelection, SearchActions } from "./searchSlice.ts";

// this has to match Search.tsx!
const filterStateSelector = (state: RootState) => state.search;
const filterName = "root";

const rowSelection = (fs: FolderSelection) => (row: MRT_Row<HierarchicalElasticSearchHit>) => {
  switch (fs) {
    case FolderSelection.FOLDER:
      return row.original.is_folder;
    case FolderSelection.SDOC:
      return !row.original.is_folder;
    default:
      return true;
  }
};

interface DocumentTableProps {
  projectId: number;
  onSearchResultsChange?: (sdocIds: number[]) => void;
}

export function SearchDocumentTable({ projectId, onSearchResultsChange }: DocumentTableProps) {
  const navigate = useNavigate();

  // global client state (react router)
  const { user } = useAuth();

  const dispatch = useAppDispatch();

  // custom row selection state (it distinguishes between folders and source documents)
  const folderSelectionType = useAppSelector((state) => state.search.folderSelectionType);
  const rowSelectionModel = useAppSelector((state) => state.search.rowSelectionModel);
  const setRowSelectionModel = useCallback(
    (updater: MRT_Updater<MRT_RowSelectionState>) => {
      const newState = updater instanceof Function ? updater(rowSelectionModel) : updater;
      // if previous state was empty, we can determine the folder selection type:
      // if it contains any numbers, it's SDOC, otherwise it's FOLDER
      if (Object.keys(rowSelectionModel).length === 0) {
        if (Object.keys(newState).some((key) => !isNaN(Number(key)))) {
          dispatch(SearchActions.onFolderSelectionChange(FolderSelection.SDOC));
          // remove all keys that are not numbers
          Object.keys(newState).forEach((key) => {
            if (isNaN(Number(key))) {
              delete newState[key];
            }
          });
        } else {
          dispatch(SearchActions.onFolderSelectionChange(FolderSelection.FOLDER));
        }
      }
      // if new state is empty, reset the folder selection type
      if (Object.keys(newState).length === 0) {
        dispatch(SearchActions.onFolderSelectionChange(FolderSelection.UNKNOWN));
      }
      dispatch(SearchActions.onRowSelectionChange(newState));
    },
    [dispatch, rowSelectionModel],
  );

  // global client state (redux) connected to table state
  const [searchQuery, setSearchQuery] = useReduxConnector(
    (state) => state.search.searchQuery,
    SearchActions.onSearchQueryChange,
  );
  const [sortingModel, setSortingModel] = useReduxConnector(
    (state) => state.search.sortingModel,
    SearchActions.onSortChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.search.columnVisibilityModel,
    SearchActions.onColumnVisibilityChange,
  );
  const [expandedModel, setExpandedModel] = useReduxConnector(
    (state) => state.search.expandedModel,
    SearchActions.onExpandedChange,
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
  const selectedSdocFolderId = useAppSelector((state) => state.search.selectedSdocFolderId);
  const selectedFolderId = useAppSelector((state) => state.search.selectedFolderId);
  const showFolders = useAppSelector((state: RootState) => state.search.showFolders);
  const selectedRows = useAppSelector((state) => selectSelectedRows(state.search));
  const selectedSdocIds = useAppSelector((state) => selectSelectedIds(state.search));

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
        case SdocColumns.SD_SOURCE_DOCUMENT_NAME:
          return {
            ...colDef,
            size: 360,
            Cell: ({ row }) =>
              row.original.is_folder ? (
                <FolderRenderer folder={row.original.id} folderType={FolderType.SDOC_FOLDER} renderName />
              ) : (
                <SdocRenderer sdoc={row.original.id} renderName />
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
      selectedFolderId,
      searchQuery, // refetch when searchQuery changes
      filter, // refetch when columnFilters changes
      sortingModel, // refetch when sorting changes
      fetchSize,
    ],
    queryFn: async ({ pageParam }) => {
      const data = await SearchService.searchSdocs({
        searchQuery: searchQuery || "",
        projectId: projectId!,
        folderId: selectedFolderId === -1 ? null : selectedFolderId, // -1 is the root folder -> search in all projects
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

  // this is a custom version of the useTransformInfiniteData hook
  const { flatData, totalFetchedSdocs, totalFetchedFolders } = useMemo(() => {
    // the backend may send a folder multiple times (e.g. in page 1, and in page 2, if the folder has many documents)
    // this is why we need to merge results here!
    if (!data || data.pages.length === 0) return { flatData: [], totalFetchedSdocs: 0, totalFetchedFolders: 0 };

    // if we do not want to show folders, we simply show all sub_rows
    if (!showFolders) {
      const flatData = data.pages.flatMap((page) =>
        page.hits.reduce((acc, hit) => {
          acc.push(...hit.sub_rows);
          return acc;
        }, [] as HierarchicalElasticSearchHit[]),
      );
      return { flatData, totalFetchedSdocs: flatData.length, totalFetchedFolders: 0 };
    }

    // if showFolders is true, we need to merge the sub_rows
    const hits: Record<number, HierarchicalElasticSearchHit> = {};
    const sortedHitIds: number[] = [];
    data.pages.forEach((page) => {
      page.hits.forEach((hit) => {
        // do the merging here!
        if (hits[hit.id]) {
          hits[hit.id].sub_rows.push(...hit.sub_rows);
        } else {
          hits[hit.id] = JSON.parse(JSON.stringify(hit)); // deep clone to avoid mutating the original hit
        }

        // keep track of the order
        if (!sortedHitIds.includes(hit.id)) {
          sortedHitIds.push(hit.id);
        }
      });
    });
    const flatData = sortedHitIds.map((id) => hits[id]);
    return {
      flatData,
      totalFetchedSdocs: flatData.reduce((acc, hit) => acc + hit.sub_rows.length, 0),
      totalFetchedFolders: flatData.length,
    };
  }, [showFolders, data]);
  const totalResults = data?.pages?.[0]?.total_results ?? 0;

  // lengthData: showFolders ? lengthDataChildren : lengthData,

  useEffect(() => {
    // if show folders, the documents are nested (inside folders)
    if (showFolders) {
      onSearchResultsChange?.(flatData.flatMap((folder) => folder.sub_rows.map((sdoc) => sdoc.id)));
    } else {
      onSearchResultsChange?.(flatData.map((sdoc) => sdoc.id));
    }
  }, [onSearchResultsChange, flatData, showFolders]);

  // table
  const table = useMaterialReactTable<HierarchicalElasticSearchHit>({
    data: flatData,
    columns: columns,
    getRowId: (row) => (row.is_folder ? `folder-${row.id}` : `${row.id}`),
    // sub rows / folders
    getSubRows: showFolders ? (originalRow) => originalRow.sub_rows : undefined, //default, can customize
    rowCount: folderSelectionType === FolderSelection.FOLDER ? totalFetchedFolders : totalFetchedSdocs,
    //expansion
    enableExpanding: showFolders,
    onExpandedChange: setExpandedModel,
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
      expanded: expandedModel,
    },
    // search query
    autoResetAll: false,
    manualFiltering: true, // turn of client-side filtering
    // enableGlobalFilter: true,
    onGlobalFilterChange: setSearchQuery,
    // selection
    enableRowSelection: rowSelection(folderSelectionType),
    onRowSelectionChange: setRowSelectionModel,
    enableSubRowSelection: false,
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
        ? {
            onClick: () => {
              dispatch(SearchActions.onToggleSelectedSdocFolderIdChange(row.original.id));
            },
            sx: {
              backgroundColor: selectedSdocFolderId === row.original.id ? "lightgrey !important" : undefined,
            },
          }
        : {
            onClick: (event) => {
              if (event.detail >= 2) {
                navigate({
                  to: "/project/$projectId/annotation/$sdocId",
                  params: { projectId, sdocId: row.original.id },
                });
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
    totalFetched: totalFetchedSdocs,
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

  const extraToolbarActions = useMemo(() => {
    if (selectedRows.length === 0) return null;

    const selectedSdocIds = selectedRows.map((id) => Number(id));
    if (selectedSdocIds.every((id) => !isNaN(id))) {
      return (
        <>
          <TagMenuButton
            selectedSdocIds={selectedSdocIds}
            popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
          />
          <DeleteSdocsButton sdocIds={selectedSdocIds} navigateTo="../search" />
          <LLMAssistanceButton sdocIds={selectedSdocIds} projectId={projectId} />
          <ClassifierInferenceButton sdocIds={selectedSdocIds} projectId={projectId} />
          <OpenInTabsButton sdocIds={selectedSdocIds} projectId={projectId} />
        </>
      );
    } else if (selectedRows.every((id) => id.startsWith("folder-"))) {
      const selectedFolderIds = selectedRows.map((id) => parseInt(id.replace("folder-", "")));
      return (
        <FolderActionMenuButton
          selectedFolderIds={selectedFolderIds}
          popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
        />
      );
    }
    return null;
  }, [selectedRows, projectId]);

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
        {extraToolbarActions}
        <Box sx={{ flexGrow: 1 }} />
        <MRT_GlobalFilterTextField table={table} />
        <SearchOptionsMenu />
        <DocumentUploadButton />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
        <ExportSdocsButton sdocIds={selectedSdocIds} />
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
              Fetched {totalFetchedSdocs} of {totalResults} documents
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
