import { Box, Card, CardContent } from "@mui/material";
import {
  MRT_ColumnDef,
  MRT_DensityState,
  MRT_PaginationState,
  MRT_RowSelectionState,
  MRT_ShowHideColumnsButton,
  MRT_SortingState,
  MRT_ToggleDensePaddingButton,
  MaterialReactTable,
  useMaterialReactTable,
} from "material-react-table";
import { useMemo } from "react";
import { ColumnInfo_SearchColumns_ } from "../../../../api/openapi/models/ColumnInfo_SearchColumns_.ts";
import { SearchColumns } from "../../../../api/openapi/models/SearchColumns.ts";
import { useAuth } from "../../../../auth/useAuth.ts";
import SdocAnnotatorsRenderer from "../../../../components/DataGrid/SdocAnnotatorsRenderer.tsx";
import SdocMetadataRenderer from "../../../../components/DataGrid/SdocMetadataRenderer.tsx";
import SdocRenderer from "../../../../components/DataGrid/SdocRenderer.tsx";
import SdocTagsRenderer from "../../../../components/DataGrid/SdocTagRenderer.tsx";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { SearchActions } from "../../searchSlice.ts";

interface SearchResultsTableProps {
  onRowClick: (sdocId: number) => void;
  onRowContextMenu: (sdocId: number) => (event: React.MouseEvent<HTMLDivElement>) => void;
  sdocIds: number[];
  columnInfo: ColumnInfo_SearchColumns_[];
}

function SearchResultsTable({ onRowClick, onRowContextMenu, sdocIds, columnInfo }: SearchResultsTableProps) {
  // global client state (react router)
  const { user } = useAuth();

  // global client state (redux)
  const rowSelectionModel = useAppSelector((state) => state.search.selectionModel);
  const paginationModel = useAppSelector((state) => state.search.paginationModel);
  const sortingModel = useAppSelector((state) => state.search.sortingModel);
  const gridDensity = useAppSelector((state) => state.search.gridDensity);
  const dispatch = useAppDispatch();

  // actions
  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!event.currentTarget) {
      return;
    }
    const sdocId = Number((event.currentTarget as HTMLDivElement).getAttribute("sdocId-id"));
    onRowContextMenu(sdocId)(event);
  };

  // computed
  const columns: MRT_ColumnDef<{ sdocId: number }>[] = useMemo(() => {
    if (!user) return [];

    const result = columnInfo.map((column) => {
      const colDef: MRT_ColumnDef<{ sdocId: number }> = {
        id: column.column.toString(),
        header: column.label,
        enableSorting: column.sortable,
      };

      switch (column.column) {
        case SearchColumns.SC_SOURCE_DOCUMENT_TYPE:
          return {
            ...colDef,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdocId} renderDoctypeIcon />,
          } as MRT_ColumnDef<{ sdocId: number }>;
        case SearchColumns.SC_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocRenderer sdoc={row.original.sdocId} renderFilename />,
          } as MRT_ColumnDef<{ sdocId: number }>;
        case SearchColumns.SC_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocTagsRenderer sdocId={row.original.sdocId} />,
          } as MRT_ColumnDef<{ sdocId: number }>;
        case SearchColumns.SC_USER_ID_LIST:
          return {
            ...colDef,
            flex: 2,
            Cell: ({ row }) => <SdocAnnotatorsRenderer sdocId={row.original.sdocId} />,
          } as MRT_ColumnDef<{ sdocId: number }>;
        case SearchColumns.SC_CODE_ID_LIST:
          return null;
        case SearchColumns.SC_SPAN_ANNOTATIONS:
          return null;
        default:
          // render metadata
          if (typeof column.column === "number") {
            return {
              ...colDef,
              flex: 2,
              Cell: ({ row }) => (
                <SdocMetadataRenderer sdocId={row.original.sdocId} projectMetadataId={column.column as number} />
              ),
            } as MRT_ColumnDef<{ sdocId: number }>;
          } else {
            return {
              ...colDef,
              Cell: () => <i>Cannot render column {column.column}</i>,
            } as MRT_ColumnDef<{ sdocId: number }>;
          }
      }
    });

    // unwanted columns are set to null, so we filter those out
    return result.filter((column) => column !== null) as MRT_ColumnDef<{ sdocId: number }>[];
  }, [columnInfo, user]);

  // table
  const table = useMaterialReactTable({
    data: sdocIds.map((sdocId) => ({ sdocId })),
    columns: columns,
    getRowId: (row) => row.sdocId.toString(),
    enableColumnFilters: false,
    // state
    state: {
      rowSelection: rowSelectionModel,
      pagination: paginationModel,
      sorting: sortingModel,
      density: gridDensity,
      isLoading: columns.length === 0,
    },
    // row actions
    muiTableBodyRowProps: ({ row }) => ({
      onClick: () => {
        onRowClick(row.original.sdocId);
      },
      onContextMenu: handleContextMenu,
    }),
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
    // pagination
    rowCount: sdocIds.length,
    onPaginationChange: (paginationUpdater) => {
      let newPaginationModel: MRT_PaginationState;
      if (typeof paginationUpdater === "function") {
        newPaginationModel = paginationUpdater(paginationModel);
      } else {
        newPaginationModel = paginationUpdater;
      }
      dispatch(SearchActions.onPaginationModelChange(newPaginationModel));
    },
    // sorting
    manualSorting: true,
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
    // column hiding: hide metadata columns by default
    initialState: {
      columnVisibility: columns.reduce((acc, column) => {
        if (!column.id) return acc;
        // this is a normal column
        if (isNaN(parseInt(column.id))) {
          return acc;
          // this is a metadata column
        } else {
          return {
            ...acc,
            [column.id]: false,
          };
        }
      }, {}),
    },
    // toolbar
    renderToolbarInternalActions: ({ table }) => (
      <Box>
        <MRT_ToggleDensePaddingButton table={table} />
        <MRT_ShowHideColumnsButton table={table} />
      </Box>
    ),
  });

  // render
  return (
    <Card sx={{ width: "100%" }} elevation={2} className="myFlexFillAllContainer myFlexContainer h100">
      <CardContent className="myFlexFillAllContainer h100" style={{ padding: 0 }}>
        <MaterialReactTable table={table} />
      </CardContent>
    </Card>
  );
}

export default SearchResultsTable;
