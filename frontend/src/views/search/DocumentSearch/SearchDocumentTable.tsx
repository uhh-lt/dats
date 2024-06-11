import { Box, Card, Toolbar, Typography } from "@mui/material";
import parse from "html-react-parser";
import {
  MRT_ColumnDef,
  MRT_ColumnSizingState,
  MRT_DensityState,
  MRT_GlobalFilterTextField,
  MRT_RowSelectionState,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_SortingState,
  MRT_TableContainer,
  MRT_ToggleDensePaddingButton,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ElasticSearchDocumentHit } from "../../../api/openapi/models/ElasticSearchDocumentHit.ts";
import { PaginatedElasticSearchDocumentHits } from "../../../api/openapi/models/PaginatedElasticSearchDocumentHits.ts";
import { SearchColumns } from "../../../api/openapi/models/SearchColumns.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import ReduxFilterDialog from "../../../components/FilterDialog/ReduxFilterDialog.tsx";
import SdocMetadataRenderer from "../../../components/Metadata/SdocMetadataRenderer.tsx";
import DeleteSdocsButton from "../../../components/SourceDocument/DeleteSdocsButton.tsx";
import DownloadSdocsButton from "../../../components/SourceDocument/DownloadSdocsButton.tsx";
import SdocAnnotatorsRenderer from "../../../components/SourceDocument/SdocAnnotatorsRenderer.tsx";
import SdocRenderer from "../../../components/SourceDocument/SdocRenderer.tsx";
import SdocTagsRenderer from "../../../components/SourceDocument/SdocTagRenderer.tsx";
import TagMenuButton from "../../../components/Tag/TagMenu/TagMenuButton.tsx";
import { getSelectedDocumentIds } from "../../../components/tableSlice.ts";
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
  const rowSelectionModel = useAppSelector((state) => state.search.rowSelectionModel);
  const selectedDocumentId = useAppSelector((state) => state.search.selectedDocumentId);
  const sortingModel = useAppSelector((state) => state.search.sortingModel);
  const columnVisibilityModel = useAppSelector((state) => state.search.columnVisibilityModel);
  const columnSizingModel = useAppSelector((state) => state.search.columnSizingModel);
  const gridDensity = useAppSelector((state) => state.search.gridDensity);
  const dispatch = useAppDispatch();
  const selectedDocumentIds = useAppSelector((state) => getSelectedDocumentIds(state.search));

  // virtualization
  const toolbarRef = useRef<HTMLDivElement>(null);
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
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.document_id} renderDoctypeIcon />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SearchColumns.SC_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            size: 360,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.document_id} renderFilename />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SearchColumns.SC_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.document_id} />,
          } as MRT_ColumnDef<ElasticSearchDocumentHit>;
        case SearchColumns.SC_USER_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocAnnotatorsRenderer sdocId={row.original.document_id} />,
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
                <SdocMetadataRenderer sdocId={row.original.document_id} projectMetadataId={parseInt(column.column)} />
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

  // table
  const table = useMaterialReactTable<ElasticSearchDocumentHit>({
    data: hits,
    columns: columns,
    getRowId: (row) => `${row.document_id}`,
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
    onGlobalFilterChange: (globalFilterUpdater) => {
      let newSearchQuery: string | undefined;
      if (typeof globalFilterUpdater === "function") {
        newSearchQuery = globalFilterUpdater(searchQuery);
      } else {
        newSearchQuery = globalFilterUpdater;
      }
      dispatch(SearchActions.onSearchQueryChange(newSearchQuery || ""));
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
      dispatch(SearchActions.onRowSelectionModelChange(newRowSelectionModel));
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
      dispatch(SearchActions.onGridDensityChange(newGridDensity));
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
                  <Typography key={`sdoc-${row.original.document_id}-highlight-${index}`} m={0.5}>
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
          navigate(`/project/${projectId}/annotation/${row.original.document_id}`);
        } else {
          dispatch(SearchActions.onToggleSelectedDocumentIdChange(row.original.document_id));
        }
      },
      sx: {
        backgroundColor: selectedDocumentId === row.original.document_id ? "lightgrey !important" : undefined,
      },
    }),
    muiToolbarAlertBannerProps: isError
      ? {
          color: "error",
          children: "Error loading data",
        }
      : { style: { width: "100%" }, className: "fixAlertBanner" },
    // toolbar
    positionToolbarAlertBanner: "head-overlay",
  });

  return (
    <>
      <Toolbar
        variant="dense"
        sx={{
          zIndex: (theme) => theme.zIndex.appBar + 1,
          bgcolor: (theme) => theme.palette.background.paper,
          borderBottom: "1px solid #e8eaed",
          boxShadow: 4,
          justifyContent: "center",
          gap: 1,
        }}
        ref={toolbarRef}
      >
        <ReduxFilterDialog
          anchorEl={toolbarRef.current}
          buttonProps={{ size: "small" }}
          filterName={filterName}
          filterStateSelector={filterStateSelector}
          filterActions={SearchFilterActions}
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
            <DownloadSdocsButton sdocIds={selectedDocumentIds} />
          </>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <MRT_GlobalFilterTextField table={table} />
        <SearchOptionsMenu />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
      </Toolbar>
      <Card elevation={8} sx={{ height: "100%", display: "flex", flexDirection: "column", m: 2 }}>
        <MRT_TableContainer table={table} style={{ flexGrow: 1 }} />
      </Card>
    </>
  );
}

export default SearchDocumentTable;
