import { SdocColumns } from "@api/models/SdocColumns";
import { SimSearchSentenceHit } from "@api/models/SimSearchSentenceHit";
import { StringOperator } from "@api/models/StringOperator";
import { CardContainer } from "@components/CardContainer";
import { DATSToolbar } from "@components/DATSToolbar";
import { useAuth } from "@core/auth";
import { URLFilterDialog } from "@core/filter";
import { useTabNavigate } from "@core/navigation";
import { SdocMetadataRenderer } from "@core/sdoc-metadata";
import {
  DeleteSdocsButton,
  SdocAnnotatorsRenderer,
  SdocExportButton,
  SdocRenderer,
  SdocSentenceRenderer,
  SdocTagsRenderer,
} from "@core/source-document";
import { TagMenuButton } from "@core/tag";
import { Box } from "@mui/material";
import { selectSelectedIds } from "@store/generic/tableSlice";
import { useAppDispatch, useAppSelector, useReduxConnector } from "@store/storeHooks";
import {
  MRT_ColumnDef,
  MRT_RowVirtualizer,
  MRT_ShowHideColumnsButton,
  MRT_TableContainer,
  MRT_ToggleDensePaddingButton,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo, useRef, useState } from "react";
import { useInitSearchFilterSlice } from "../../../_hooks/useInitSearchFilterSlice";
import { SearchActions } from "../../../store/documentSearchSlice";
import { SentenceSearchActions } from "../../../store/sentenceSearchSlice";
import { SentenceSearchRouteAPI } from "../_hooks/sentenceSearchRouteAPI";
import { SearchBar } from "./SearchBar";
import { SentenceSimilaritySearchOptionsMenu } from "./SentenceSimilaritySearchOptionsMenu";

const filterName = "sentenceSimilaritySearch";
const defaultFilterExpression = {
  id: "",
  column: SdocColumns.SD_SOURCE_DOCUMENT_NAME,
  operator: StringOperator.STRING_CONTAINS,
  value: "",
};

interface SentenceSimilaritySearchTableProps {
  projectId: number;
  data: SimSearchSentenceHit[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
}

export function SentenceSimilaritySearchTable({
  projectId,
  data,
  isLoading,
  isFetching,
  isError,
}: SentenceSimilaritySearchTableProps) {
  const tabNavigate = useTabNavigate();

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
  const [toolbarEl, setToolbarEl] = useState<HTMLDivElement | null>(null);
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
          tabNavigate({
            to: "/project/$projectId/annotation/$sdocId",
            params: { projectId, sdocId: row.original.sdoc_id },
          });
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
      <DATSToolbar variant="dense" ref={setToolbarEl}>
        <URLFilterDialog
          anchorEl={toolbarEl}
          buttonProps={{ size: "small" }}
          filterName={filterName}
          routeApi={SentenceSearchRouteAPI}
          defaultFilterExpression={defaultFilterExpression}
          column2InfoSelector={(state) => state.search.column2Info}
          transformOrigin={{ horizontal: "left", vertical: "top" }}
          anchorOrigin={{ horizontal: "left", vertical: "bottom" }}
        />
        {selectedDocumentIds.length > 0 && (
          <>
            <TagMenuButton
              selectedSdocIds={selectedDocumentIds}
              popoverOrigin={{ horizontal: "center", vertical: "bottom" }}
            />
            <DeleteSdocsButton
              sdocIds={selectedDocumentIds}
              onDeleted={(ids) => dispatch(SearchActions.updateSelectedDocumentsOnMultiDelete(ids))}
            />
          </>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <SearchBar placeholder="Search" />
        <SentenceSimilaritySearchOptionsMenu />
        <MRT_ShowHideColumnsButton table={table} />
        <MRT_ToggleDensePaddingButton table={table} />
        <SdocExportButton sdocIds={selectedDocumentIds} />
      </DATSToolbar>
      <CardContainer sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
        <MRT_TableContainer table={table} style={{ flexGrow: 1 }} />
      </CardContainer>
    </Box>
  );
}
