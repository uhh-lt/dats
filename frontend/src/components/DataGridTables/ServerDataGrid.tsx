import { DataGrid, GridColDef, GridPaginationModel, GridSortModel } from "@mui/x-data-grid";

interface ServerDataGridProps {
  rows: { id: number }[];
  columns: GridColDef<{ id: number }>[];
  rowCount: number;
  loading: boolean;
  rowSelectionModel: number[];
  onRowSelectionModelChange: (selectionModel: number[]) => void;
  paginationModel: GridPaginationModel;
  onPaginationModelChange: (model: GridPaginationModel) => void;
  sortModel: GridSortModel;
  onSortModelChange: (model: GridSortModel) => void;
  onRowContextMenu: (event: React.MouseEvent<HTMLDivElement>, rowId: number) => void;
}

function ServerDataGrid({
  rows,
  columns,
  rowCount,
  loading,
  rowSelectionModel,
  onRowSelectionModelChange,
  paginationModel,
  onPaginationModelChange,
  sortModel,
  onSortModelChange,
  onRowContextMenu,
}: ServerDataGridProps) {
  // actions
  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!event.currentTarget) {
      return;
    }
    const rowId = Number((event.currentTarget as HTMLDivElement).getAttribute("data-id"));
    onRowContextMenu(event, rowId);
  };

  return (
    <DataGrid
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      style={{ border: "none" }}
      slotProps={{
        row: {
          onContextMenu: handleContextMenu,
        },
      }}
      disableColumnFilter
      // selection
      checkboxSelection
      rowSelectionModel={rowSelectionModel}
      onRowSelectionModelChange={(selectionModel) => onRowSelectionModelChange(selectionModel as number[])}
      // server side pagination
      autoPageSize
      paginationMode="server"
      rowCount={rowCount}
      paginationModel={paginationModel}
      onPaginationModelChange={onPaginationModelChange}
      keepNonExistentRowsSelected
      loading={loading}
      // sorting
      sortingMode="server"
      sortModel={sortModel}
      onSortModelChange={onSortModelChange}
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
    />
  );
}

export default ServerDataGrid;
