import { FolderType } from "@api/models/FolderType";
import { HierarchicalElasticSearchHit } from "@api/models/HierarchicalElasticSearchHit";
import { PaginatedSDocHits } from "@api/models/PaginatedSDocHits";
import { SdocColumns } from "@api/models/SdocColumns";
import { StringOperator } from "@api/models/StringOperator";
import { CardContainer } from "@components/CardContainer";
import { DATSToolbar } from "@components/DATSToolbar";
import { Draggable } from "@components/drag-and-drop";
import { useAuth } from "@core/auth";
import { URLFilterDialog } from "@core/filter";
import { FolderActionMenuButton, FolderRenderer } from "@core/folder";
import { OpenInTabsButton } from "@core/navigation";
import { SdocMetadataRenderer } from "@core/sdoc-metadata";
import {
  DeleteSdocsButton,
  SdocAnnotatorsRenderer,
  SdocExportButton,
  SdocRenderer,
  SdocTagsRenderer,
} from "@core/source-document";
import { TagMenuButton } from "@core/tag";
// TODO: Fix feature-to-feature imports
// eslint-disable-next-line boundaries/element-types
import { ClassifierInferenceButton } from "@features/classifier";
// TODO: Fix feature-to-feature imports
// eslint-disable-next-line boundaries/element-types
import { DocumentUploadButton } from "@features/document-upload";
// TODO: Fix feature-to-feature imports
// eslint-disable-next-line boundaries/element-types
import { LLMAssistanceButton } from "@features/llm-assistant";
import { useTableFetchMoreOnScroll } from "@hooks/useTableInfiniteScroll";
import { useURLConnector } from "@hooks/useURLConnector";
import { useURLConnectorDebounced } from "@hooks/useURLConnectorDebounced";
import { Box, Button, Divider, Stack, Typography } from "@mui/material";
import { selectSelectedIds, selectSelectedRows } from "@store/generic/tableSlice";
import { useAppDispatch, useAppSelector, useReduxConnector } from "@store/storeHooks";
import { InfiniteData } from "@tanstack/react-query";
import parse from "html-react-parser";
import {
  MRT_ColumnDef,
  MRT_GlobalFilterTextField,
  MRT_LinearProgressBar,
  MRT_Row,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_SortingState,
  MRT_TableContainer,
  MRT_ToggleDensePaddingButton,
  MRT_ToolbarAlertBanner,
  MRT_Updater,
  useMaterialReactTable,
} from "material-react-table";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInitSearchFilterSlice } from "../../../_hooks/useInitSearchFilterSlice";
import { FolderSelection, SearchActions } from "../../../store/documentSearchSlice";
import { DocumentSearchRouteAPI } from "../_hooks/documentSearchRouteAPI";
import { NoDocumentsPlaceholder } from "./NoDocumentsPlaceholder";
import { SearchOptionsMenu } from "./SearchOptionsMenu";

const defaultFilterExpression = {
  id: "",
  column: SdocColumns.SD_SOURCE_DOCUMENT_NAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

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
  searchData: InfiniteData<PaginatedSDocHits, unknown> | undefined;
  isError: boolean;
  isFetching: boolean;
  isLoading: boolean;
  onFetchNextPage: () => void;
  onSearchResultsChange?: (sdocIds: number[]) => void;
}

export function SearchDocumentTable({
  projectId,
  searchData,
  isError,
  isFetching,
  isLoading,
  onFetchNextPage,
  onSearchResultsChange,
}: DocumentTableProps) {
  const { searchFilter } = DocumentSearchRouteAPI.useSearch();
  const [searchQuery, setSearchQuery] = useURLConnectorDebounced(DocumentSearchRouteAPI, "searchQuery");
  const [sortingModel, setSortingModel] = useURLConnector(DocumentSearchRouteAPI, "sortingModel");
  const navigate = DocumentSearchRouteAPI.useNavigate();

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
  const showFolders = useAppSelector((state) => state.search.showFolders);
  const selectedRows = useAppSelector((state) => selectSelectedRows(state.search));
  const selectedSdocIds = useAppSelector((state) => selectSelectedIds(state.search));

  // virtualization
  const [toolbarEl, setToolbarEl] = useState<HTMLDivElement | null>(null);
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

  // this is a custom version of the useTransformInfiniteData hook
  const { flatData, totalFetchedSdocs, totalFetchedFolders } = useMemo(() => {
    // the backend may send a folder multiple times (e.g. in page 1, and in page 2, if the folder has many documents)
    // this is why we need to merge results here!
    if (!searchData || searchData.pages.length === 0)
      return { flatData: [], totalFetchedSdocs: 0, totalFetchedFolders: 0 };

    // if we do not want to show folders, we simply show all sub_rows
    if (!showFolders) {
      const flatData = searchData.pages.flatMap((page) =>
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
    searchData.pages.forEach((page) => {
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
  }, [showFolders, searchData]);
  const totalResults = searchData?.pages?.[0]?.total_results ?? 0;

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
      sorting: sortingModel as MRT_SortingState,
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
            onClick: (event) => {
              if (event.detail >= 2) {
                let doc = row.original;
                while (doc.is_folder && doc.sub_rows.length > 0) {
                  // this is a simple DFS to find the first proper document (not a folder)
                  doc = doc.sub_rows[0];
                }
                if (!doc.is_folder) {
                  navigate(`/project/${projectId}/annotation/${doc.id}`);
                }
              } else {
                dispatch(SearchActions.onToggleSelectedSdocFolderIdChange(row.original.id));
              }
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
                  search: { visibleUserId: undefined, compareWithUserId: undefined, selectedAnnotationId: undefined },
                });
              } else {
                dispatch(SearchActions.onToggleSelectedDocumentIdChange(row.original.id));
              }
            },
            sx: {
              backgroundColor: selectedDocumentId === row.original.id ? "lightgrey !important" : undefined,
            },
          },
    renderEmptyRowsFallback: searchFilter.items.length === 0 ? () => <NoDocumentsPlaceholder /> : undefined,
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
    fetchNextPage: onFetchNextPage,
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
  }, [projectId, searchQuery, searchFilter, sortingModel]);

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
          <DeleteSdocsButton
            sdocIds={selectedSdocIds}
            onDeleted={(ids) => dispatch(SearchActions.updateSelectedDocumentsOnMultiDelete(ids))}
          />
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
          onMoveFolder={() => dispatch(SearchActions.onMoveFolders())}
        />
      );
    }
    return null;
  }, [selectedRows, projectId, dispatch]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <DATSToolbar variant="dense" ref={setToolbarEl}>
        <URLFilterDialog
          anchorEl={toolbarEl}
          buttonProps={{ size: "small" }}
          routeApi={DocumentSearchRouteAPI}
          defaultFilterExpression={defaultFilterExpression}
          column2InfoSelector={(state) => state.search.column2Info}
          transformOrigin={{ horizontal: "left", vertical: "top" }}
          anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
        />
        {extraToolbarActions}
        <Box sx={{ flexGrow: 1 }} />
        <MRT_GlobalFilterTextField table={table} />
        <SearchOptionsMenu />
        <DocumentUploadButton />
        <FolderToggleVisibilityButton />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
        <SdocExportButton sdocIds={selectedSdocIds} />
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
            <Button
              size="small"
              onClick={() =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    fetchSize: totalResults,
                  }),
                  replace: true,
                })
              }
            >
              Fetch All
            </Button>
          </Stack>
        </Box>
      </CardContainer>
    </Box>
  );
}
