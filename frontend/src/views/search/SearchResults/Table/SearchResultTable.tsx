import { Card, CardContent, CircularProgress } from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { useMemo } from "react";
import { ColumnInfo_SearchColumns_, SearchColumns } from "../../../../api/openapi";
import { useAuth } from "../../../../auth/AuthProvider";
import SdocAnnotatorsRenderer from "../../../../components/DataGrid/SdocAnnotatorsRenderer";
import SdocMetadataRenderer from "../../../../components/DataGrid/SdocMetadataRenderer";
import SdocRenderer from "../../../../components/DataGrid/SdocRenderer";
import SdocTagsRenderer from "../../../../components/DataGrid/SdocTagRenderer";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks";
import { SearchActions } from "../../searchSlice";
import SearchTableToolbar from "./SearchTableToolbar";

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
  const rowSelectionModel = useAppSelector((state) => state.search.selectedDocumentIds);
  const page = useAppSelector((state) => state.search.page);
  const rowsPerPage = useAppSelector((state) => state.search.rowsPerPage);
  const sortModel = useAppSelector((state) => state.search.sortModel);
  const gridDensity = useAppSelector((state) => state.search.gridDensity);
  const dispatch = useAppDispatch();

  // actions
  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!event.currentTarget) {
      return;
    }
    const sdocId = Number((event.currentTarget as HTMLDivElement).getAttribute("data-id"));
    onRowContextMenu(sdocId)(event);
  };

  // computed
  const columns: GridColDef<{ id: number }>[] = useMemo(() => {
    if (!user) return [];

    const result = columnInfo.map((column) => {
      const colDef = {
        field: column.column,
        headerName: column.label,
        sortable: column.sortable,
      } as GridColDef<{ id: number }>;

      switch (column.column) {
        case SearchColumns.SC_SOURCE_DOCUMENT_TYPE:
          return {
            ...colDef,
            renderCell: (params) => <SdocRenderer sdoc={params.row.id} renderDoctypeIcon />,
          } as GridColDef<{ id: number }>;
        case SearchColumns.SC_SOURCE_DOCUMENT_FILENAME:
          return {
            ...colDef,
            flex: 2,
            renderCell: (params) => <SdocRenderer sdoc={params.row.id} renderFilename />,
          } as GridColDef<{ id: number }>;
        case SearchColumns.SC_DOCUMENT_TAG_ID_LIST:
          return {
            ...colDef,
            flex: 2,
            renderCell: (params) => <SdocTagsRenderer sdocId={params.row.id} />,
          } as GridColDef<{ id: number }>;
        case SearchColumns.SC_USER_ID_LIST:
          return {
            ...colDef,
            flex: 2,
            renderCell: (params) => <SdocAnnotatorsRenderer sdocId={params.row.id} />,
          } as GridColDef<{ id: number }>;
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
              renderCell: (params) => (
                <SdocMetadataRenderer sdocId={params.row.id} projectMetadataId={column.column as number} />
              ),
            } as GridColDef<{ id: number }>;
          } else {
            return {
              ...colDef,
              flex: 1,
              renderCell: (params) => <i>Cannot render column {column.column}</i>,
            } as GridColDef<{ id: number }>;
          }
      }
    });

    // unwanted columns are set to null, so we filter those out
    return result.filter((column) => column !== null) as GridColDef<{ id: number }>[];
  }, [columnInfo, user]);

  // render
  let tableContent: JSX.Element;
  if (columns.length === 0) {
    tableContent = <CircularProgress />;
  } else {
    tableContent = (
      <DataGrid
        rows={sdocIds.map((id) => ({ id }))}
        columns={columns}
        getRowId={(row) => row.id}
        style={{ border: "none" }}
        slotProps={{
          row: {
            onContextMenu: handleContextMenu,
          },
        }}
        disableColumnFilter
        // click
        onRowClick={(params) => onRowClick(params.row.id)}
        // selection
        // disableRowSelectionOnClick
        checkboxSelection
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={(selectionModel) =>
          dispatch(SearchActions.setSelectedDocuments(selectionModel as number[]))
        }
        // pagination
        autoPageSize
        rowCount={sdocIds.length}
        paginationModel={{
          page: page,
          pageSize: rowsPerPage,
        }}
        onPaginationModelChange={(model) => dispatch(SearchActions.onPaginationModelChange(model))}
        // sorting
        sortingMode="server"
        sortModel={sortModel}
        onSortModelChange={(model) => dispatch(SearchActions.onSortModelChange(model))}
        onStateChange={(state) => {
          if (gridDensity !== state.density.value) {
            dispatch(SearchActions.setTableDensity(state.density.value));
          }
        }}
        density={gridDensity}
        // column hiding: hide metadata columns by default
        initialState={{
          columns: {
            columnVisibilityModel: columns.reduce((acc, column) => {
              if (typeof column.field === "number") {
                return {
                  ...acc,
                  [column.field as number]: false,
                };
              } else {
                return acc;
              }
            }, {}),
          },
        }}
        // toolbar
        slots={{ toolbar: SearchTableToolbar }}
      />
    );
  }

  return (
    <Card sx={{ width: "100%" }} elevation={2} className="myFlexFillAllContainer myFlexContainer h100">
      <CardContent className="myFlexFillAllContainer h100" style={{ padding: 0 }}>
        {tableContent}
      </CardContent>
    </Card>
  );
}

export default SearchResultsTable;
