import { Box } from "@mui/material";
import {
  MRT_ColumnDef,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_TableContainer,
  MRT_ToggleDensePaddingButton,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { SdocColumns } from "../../../api/openapi/models/SdocColumns.ts";
import { SimSearchSentenceHit } from "../../../api/openapi/models/SimSearchSentenceHit.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import ExportSdocsButton from "../../../components/Export/ExportSdocsButton.tsx";
import ReduxFilterDialog from "../../../components/FilterDialog/ReduxFilterDialog.tsx";
import CardContainer from "../../../components/MUI/CardContainer.tsx";
import DATSToolbar from "../../../components/MUI/DATSToolbar.tsx";
import SdocMetadataRenderer from "../../../components/Metadata/SdocMetadataRenderer.tsx";
import DeleteSdocsButton from "../../../components/SourceDocument/DeleteSdocsButton.tsx";
import SdocAnnotatorsRenderer from "../../../components/SourceDocument/SdocAnnotatorsRenderer.tsx";
import SdocRenderer from "../../../components/SourceDocument/SdocRenderer.tsx";
import SdocSentenceRenderer from "../../../components/SourceDocument/SdocSentenceRenderer.tsx";
import SdocTagsRenderer from "../../../components/SourceDocument/SdocTagRenderer.tsx";
import TagMenuButton from "../../../components/Tag/TagMenu/TagMenuButton.tsx";
import { selectSelectedIds } from "../../../components/tableSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../store/store.ts";
import { useReduxConnector } from "../../../utils/useReduxConnector.ts";
import { SearchActions } from "../DocumentSearch/searchSlice.ts";
import { useInitSearchFilterSlice } from "../useInitSearchFilterSlice.ts";
import SearchBar from "./SearchBar.tsx";
import SentenceSimilaritySearchOptionsMenu from "./SentenceSimilaritySearchOptionsMenu.tsx";
import { SentenceSearchActions } from "./sentenceSearchSlice.ts";

// this has to match SentenceSimilaritySearch.tsx!
const filterStateSelector = (state: RootState) => state.search;
const filterName = "sentenceSimilaritySearch";

interface SentenceSimilaritySearchTableProps {
  projectId: number;
  data: SimSearchSentenceHit[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
}

function SentenceSimilaritySearchTable({
  projectId,
  data,
  isLoading,
  isFetching,
  isError,
}: SentenceSimilaritySearchTableProps) {
  const navigate = useNavigate();

  // global client state (react router)
  const { user } = useAuth();

  // global client state (redux)

  const [rowSelectionModel, setRowSelectionModel] = useReduxConnector(
    (state) => state.sentenceSearch.rowSelectionModel,
    SentenceSearchActions.onRowSelectionChange,
  );
  const [sortingModel, setSortingModel] = useReduxConnector(
    (state) => state.sentenceSearch.sortingModel,
    SentenceSearchActions.onSortChange,
  );
  const [columnVisibilityModel, setColumnVisibilityModel] = useReduxConnector(
    (state) => state.sentenceSearch.columnVisibilityModel,
    SentenceSearchActions.onColumnVisibilityChange,
  );
  const [columnSizingModel, setColumnSizingModel] = useReduxConnector(
    (state) => state.sentenceSearch.columnSizingModel,
    SentenceSearchActions.onColumnSizingChange,
  );
  const [gridDensity, setGridDensityModel] = useReduxConnector(
    (state) => state.sentenceSearch.gridDensityModel,
    SentenceSearchActions.onGridDensityChange,
  );
  const selectedDocumentId = useAppSelector((state) => state.sentenceSearch.selectedDocumentId);
  const dispatch = useAppDispatch();
  const selectedDocumentIds = useAppSelector((state) => selectSelectedIds(state.sentenceSearch));

  // virtualization
  const toolbarRef = useRef<HTMLDivElement>(null);
  const rowVirtualizerInstanceRef = useRef<MRT_RowVirtualizer>(null);

  // table columns
  const tableInfo = useInitSearchFilterSlice({ projectId });
  const columns = useMemo(() => {
    if (!tableInfo || !user) return [];

    const result = tableInfo.map((column) => {
      const colDef: MRT_ColumnDef<SimSearchSentenceHit> = {
        id: column.column,
        accessorFn: () => null,
        header: column.label,
        enableSorting: false,
      };

      switch (column.column) {
        case SdocColumns.SD_SOURCE_DOCUMENT_TYPE:
          return {
            ...colDef,
            size: 100,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdoc_id} renderDoctypeIcon />,
          } as MRT_ColumnDef<SimSearchSentenceHit>;
        case SdocColumns.SD_SOURCE_DOCUMENT_NAME:
          return {
            ...colDef,
            size: 360,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdoc_id} renderName />,
          } as MRT_ColumnDef<SimSearchSentenceHit>;
        case SdocColumns.SD_TAG_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.sdoc_id} />,
          } as MRT_ColumnDef<SimSearchSentenceHit>;
        case SdocColumns.SD_USER_ID_LIST:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocAnnotatorsRenderer sdocId={row.original.sdoc_id} />,
          } as MRT_ColumnDef<SimSearchSentenceHit>;
        case SdocColumns.SD_CODE_ID_LIST:
          return null;
        case SdocColumns.SD_SPAN_ANNOTATIONS:
          return null;
        default:
          // render metadata
          if (!isNaN(parseInt(column.column))) {
            return {
              ...colDef,
              Cell: ({ row }) => (
                <SdocMetadataRenderer sdocId={row.original.sdoc_id} projectMetadataId={parseInt(column.column)} />
              ),
            } as MRT_ColumnDef<SimSearchSentenceHit>;
          } else {
            return {
              ...colDef,
              Cell: () => <i>Cannot render column {column.column}</i>,
            } as MRT_ColumnDef<SimSearchSentenceHit>;
          }
      }
    });

    // custom columns
    const scoreCell = {
      id: "score",
      header: "Score",
      enableSorting: false,
      accessorFn: (row) => row.score.toFixed(2),
    } as MRT_ColumnDef<SimSearchSentenceHit>;

    const sentenceCell = {
      id: "sentence",
      header: "Sentence",
      enableSorting: false,
      size: 360,
      accessorFn: () => null,
      Cell: ({ row }) => <SdocSentenceRenderer sdoc={row.original.sdoc_id} sentenceId={row.original.sentence_id} />,
    } as MRT_ColumnDef<SimSearchSentenceHit>;

    // unwanted columns are set to null, so we filter those out
    return [scoreCell, sentenceCell, ...result].filter(
      (column) => column !== null,
    ) as MRT_ColumnDef<SimSearchSentenceHit>[];
  }, [tableInfo, user]);

  // table
  const table = useMaterialReactTable<SimSearchSentenceHit>({
    data: data || [],
    columns: columns,
    getRowId: (row) => `${row.sdoc_id}-${row.sentence_id}`,
    // state
    state: {
      rowSelection: rowSelectionModel,
      sorting: sortingModel,
      columnVisibility: columnVisibilityModel,
      columnSizing: columnSizingModel,
      density: gridDensity,
      isLoading: isLoading || columns.length === 0,
      showAlertBanner: isError,
      showProgressBars: isFetching,
      showGlobalFilter: false,
    },
    // search query
    autoResetAll: false,
    manualFiltering: true, // turn of client-side filtering
    // enableGlobalFilter: true,
    // onGlobalFilterChange: setSearchQuery,
    // selection
    enableRowSelection: true,
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
    manualSorting: true,
    onSortingChange: setSortingModel,
    // density
    onDensityChange: setGridDensityModel,
    // column visiblility
    onColumnVisibilityChange: setColumnVisibilityModel,
    // column resizing
    enableColumnResizing: true,
    columnResizeMode: "onEnd",
    onColumnSizingChange: setColumnSizingModel,
    // mui components
    muiTableBodyRowProps: ({ row }) => ({
      onClick: (event) => {
        if (event.detail >= 2) {
          navigate(`/project/${projectId}/annotation/${row.original.sdoc_id}`);
        } else {
          dispatch(SentenceSearchActions.onToggleSelectedDocumentIdChange(row.original.sdoc_id));
        }
      },
      sx: {
        backgroundColor: selectedDocumentId === row.original.sdoc_id ? "lightgrey !important" : undefined,
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
          </>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <SearchBar placeholder="Search" />
        <SentenceSimilaritySearchOptionsMenu />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
        <ExportSdocsButton sdocIds={selectedDocumentIds} />
      </DATSToolbar>
      <CardContainer sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <MRT_TableContainer table={table} style={{ flexGrow: 1 }} />
      </CardContainer>
    </Box>
  );
}

export default SentenceSimilaritySearchTable;
