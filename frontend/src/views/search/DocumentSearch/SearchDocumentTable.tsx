import { Box, Stack, Typography } from "@mui/material";
import parse from "html-react-parser";
import {
  MRT_ColumnDef,
  MRT_ColumnSizingState,
  MRT_DensityState,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_SortingState,
  MRT_ToggleDensePaddingButton,
  MRT_ToggleGlobalFilterButton,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ElasticSearchDocumentHit } from "../../../api/openapi/models/ElasticSearchDocumentHit.ts";
import { PaginatedElasticSearchDocumentHits } from "../../../api/openapi/models/PaginatedElasticSearchDocumentHits.ts";
import { SearchColumns } from "../../../api/openapi/models/SearchColumns.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import SdocAnnotatorsRenderer from "../../../components/DataGrid/SdocAnnotatorsRenderer.tsx";
import SdocMetadataRenderer from "../../../components/DataGrid/SdocMetadataRenderer.tsx";
import SdocRenderer from "../../../components/DataGrid/SdocRenderer.tsx";
import SdocTagsRenderer from "../../../components/DataGrid/SdocTagRenderer.tsx";
import DeleteSdocsButton from "../../../components/SourceDocument/DeleteSdocsButton.tsx";
import DownloadSdocsButton from "../../../components/SourceDocument/DownloadSdocsButton.tsx";
import TagMenuButton from "../../../components/Tag/TagMenu/TagMenuButton.tsx";
import ReduxFilterDialog from "../../../features/FilterDialog/ReduxFilterDialog.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { SearchFilterActions } from "../searchFilterSlice.ts";
import { useInitSearchFilterSlice } from "../useInitSearchFilterSlice.ts";
import SearchOptionsMenu from "./SearchOptionsMenu.tsx";
import { SearchActions } from "./searchSlice.ts";

// this has to match Search.tsx!
const filterStateSelector = (state: RootState) => state.searchFilter;
const filterName = "root";

interface DocumentTableProps {
  projectId: number;
  data: PaginatedElasticSearchDocumentHits | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
}

function SearchDocumentTable({ projectId, data, isLoading, isFetching, isError }: DocumentTableProps) {
  const navigate = useNavigate();

  // global client state (react router)
  const { user } = useAuth();

  // global client state (redux)
  const searchQuery = useAppSelector((state) => state.search.searchQuery);
  const rowSelectionModel = useAppSelector((state) => state.search.selectionModel);
  const selectedDocumentId = useAppSelector((state) => state.search.selectedDocumentId);
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);
  const sortingModel = useAppSelector((state) => state.search.sortingModel);
  const columnVisibilityModel = useAppSelector((state) => state.search.columnVisibilityModel);
  const columnSizingModel = useAppSelector((state) => state.search.columnSizingModel);
  const gridDensity = useAppSelector((state) => state.search.gridDensity);
  const dispatch = useAppDispatch();

  // virtualization
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitSearchFilterSlice({ projectId });
  const columns = useMemo(() => {
    if (!tableInfo || !user) return [];

    const result = tableInfo.map((column) => {
      const colDef: MRT_ColumnDef<ElasticSearchDocumentHit> = {
        id: column.column,
        accessorFn: () => null,
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case SearchColumns.SC_SOURCE_DOCUMENT_TYPE:
          return {
            ...colDef,
            size: 100,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdoc_id} renderDoctypeIcon />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SearchColumns.SC_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            size: 360,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdoc_id} renderFilename />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SearchColumns.SC_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.sdoc_id} />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SearchColumns.SC_USER_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocAnnotatorsRenderer sdocId={row.original.sdoc_id} />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SearchColumns.SC_CODE_ID_LIST:
          return null;
        case SearchColumns.SC_SPAN_ANNOTATIONS:
          return null;
        default:
          // render metadata
          if (!isNaN(parseInt(column.column))) {
            return {
              ...colDef,
              Cell: ({ row }) => (
                <SdocMetadataRenderer sdocId={row.original.sdoc_id} projectMetadataId={parseInt(column.column)} />
              ),
            } as MRT_ColumnDef<ElasticSearchDocumentHit>;
          } else {
            return {
              ...colDef,
              Cell: () => <i>Cannot render column {column.column}</i>,
            } as MRT_ColumnDef<ElasticSearchDocumentHit>;
          }
      }
    });

    // unwanted columns are set to null, so we filter those out
    return result.filter((column) => column !== null) as MRT_ColumnDef<ElasticSearchDocumentHit>[];
  }, [tableInfo, user]);

  // table data
  const hits = data?.hits ?? [];
  const totalDBRowCount = data?.total_results ?? 0;
  const totalFetched = hits.length;

  // table
  const table = useMaterialReactTable<ElasticSearchDocumentHit>({
    data: hits,
    columns: columns,
    getRowId: (row) => `${row.sdoc_id}`,
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
    },
    // search query
    autoResetAll: false,
    manualFiltering: true, // turn of client-side filtering
    // enableGlobalFilter: true,
    onGlobalFilterChange: (globalFilterUpdater) => {
      let newSearchQuery: string | undefined;
      if (typeof globalFilterUpdater === "function") {
        newSearchQuery = globalFilterUpdater(searchQuery);
      } else {
        newSearchQuery = globalFilterUpdater;
      }
      dispatch(SearchActions.onChangeSearchQuery(newSearchQuery || ""));
    },
    // selection
    enableRowSelection: true,
    onRowSelectionChange: (rowSelectionUpdater) => {
      let newRowSelectionModel: MRT_RowSelectionState;
      if (typeof rowSelectionUpdater === "function") {
        newRowSelectionModel = rowSelectionUpdater(rowSelectionModel);
      } else {
        newRowSelectionModel = rowSelectionUpdater;
      }
      dispatch(SearchActions.onUpdateSelectionModel(newRowSelectionModel));
    },
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
    onSortingChange: (sortingUpdater) => {
      let newSortingModel: MRT_SortingState;
      if (typeof sortingUpdater === "function") {
        newSortingModel = sortingUpdater(sortingModel);
      } else {
        newSortingModel = sortingUpdater;
      }
      dispatch(SearchActions.onSortModelChange(newSortingModel));
    },
    // density
    onDensityChange: (densityUpdater) => {
      let newGridDensity: MRT_DensityState;
      if (typeof densityUpdater === "function") {
        newGridDensity = densityUpdater(gridDensity);
      } else {
        newGridDensity = densityUpdater;
      }
      dispatch(SearchActions.setTableDensity(newGridDensity));
    },
    // column visiblility
    onColumnVisibilityChange: (updater) => {
      const newVisibilityModel = updater instanceof Function ? updater(columnVisibilityModel) : updater;
      dispatch(SearchActions.onColumnVisibilityChange(newVisibilityModel));
    },
    // column resizing
    enableColumnResizing: true,
    columnResizeMode: "onEnd",
    onColumnSizingChange: (sizingUpdater) => {
      let newColumnSizingModel: MRT_ColumnSizingState;
      if (typeof sizingUpdater === "function") {
        newColumnSizingModel = sizingUpdater(columnSizingModel);
      } else {
        newColumnSizingModel = sizingUpdater;
      }
      dispatch(SearchActions.onColumnSizingChange(newColumnSizingModel));
    },
    // detail (highlights)
    renderDetailPanel:
      searchQuery.trim().length > 0
        ? ({ row }) =>
            row.original.highlights ? (
              <Box className="search-result-highlight">
                {row.original.highlights.map((highlight, index) => (
                  <Typography key={`sdoc-${row.original.sdoc_id}-highlight-${index}`} m={0.5}>
                    {parse(highlight)}
                  </Typography>
                ))}
              </Box>
            ) : null
        : undefined,
    // mui components
    muiTableBodyRowProps: ({ row }) => ({
      onClick: (event) => {
        if (event.detail >= 2) {
          navigate(`/project/${projectId}/annotation/${row.original.sdoc_id}`);
        } else {
          dispatch(SearchActions.onToggleSelectedDocumentIdChange(row.original.sdoc_id));
        }
      },
      sx: {
        backgroundColor: selectedDocumentId === row.original.sdoc_id ? "lightgrey !important" : undefined,
      },
    }),
    muiTablePaperProps: {
      elevation: 8,
      style: { height: "100%", display: "flex", flexDirection: "column" },
    },
    muiTableContainerProps: {
      ref: tableContainerRef, //get access to the table container element
      style: { flexGrow: 1 },
    },
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : undefined,
    // toolbar
    positionToolbarAlertBanner: "head-overlay",
    renderTopToolbarCustomActions: () => (
      <Stack direction={"row"} spacing={1} alignItems="center" height={48}>
        <ReduxFilterDialog
          anchorEl={tableContainerRef.current}
          buttonProps={{ size: "small" }}
          filterName={filterName}
          filterStateSelector={filterStateSelector}
          filterActions={SearchFilterActions}
        />
        {selectedDocumentIds.length > 0 && (
          <>
            <TagMenuButton
              selectedSdocIds={selectedDocumentIds}
              popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
            />
            <DeleteSdocsButton sdocIds={selectedDocumentIds} navigateTo="../search" />
            <DownloadSdocsButton sdocIds={selectedDocumentIds} />
          </>
        )}
      </Stack>
    ),
    renderToolbarInternalActions: ({ table }) => (
      <Stack direction={"row"} spacing={1} alignItems="center" height={48}>
        <MRT_ToggleGlobalFilterButton table={table} disabled={false} />
        <SearchOptionsMenu />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </Stack>
    ),
    renderBottomToolbarCustomActions: () => (
      <Stack direction={"row"} spacing={1} alignItems="center">
        <Typography>
          Fetched {totalFetched} of {totalDBRowCount} total documents.
        </Typography>
      </Stack>
    ),
  });

  return <MaterialReactTable table={table} />;
}

export default SearchDocumentTable;
