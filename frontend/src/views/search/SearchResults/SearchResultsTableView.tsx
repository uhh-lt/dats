import { DataGrid, GridColDef, GridToolbar, GridValueGetterParams } from "@mui/x-data-grid";

import { Checkbox } from "@mui/material";
import * as React from "react";
import { useMemo } from "react";
import { SearchResults } from "../../../api/SearchHooks";
import { SourceDocumentRead } from "../../../api/openapi";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import "./SearchResults.css";
import SdocHooks from "../../../api/SdocHooks";

import { tableViewColDef } from "./Table/ColumnDefinition";

declare module "@mui/x-data-grid" {
  interface FooterPropsOverrides {
    newPage: number;
  }
}

interface SearchResultsTableViewProps {
  searchResults: SearchResults<any>;
  handleResultClick: (sdoc: SourceDocumentRead) => void;
  handleOnContextMenu?: (sdocId: number) => (event: React.MouseEvent) => void;
  handleOnCheckboxChange?: (event: React.ChangeEvent<HTMLInputElement>, sdocId: number) => void;
}

export default function SearchResultsTableView({
  searchResults,
  handleResultClick,
  handleOnContextMenu,
  handleOnCheckboxChange,
}: SearchResultsTableViewProps) {
  const sdocIds = searchResults.getSearchResultSDocIds();
  const sdocs = SdocHooks.useGetAllDocumentDataBulk(sdocIds).data;
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);
  const paginationModel = useAppSelector((state) => state.search.tableViewPaginationModel);

  const columns: GridColDef[] = useMemo(() => {
    return [
      {
        field: "select",
        headerName: "",
        minWidth: 25,
        editable: false,
        sortable: false,
        filterable: false,
        renderCell: (params: GridValueGetterParams) =>
          handleOnCheckboxChange ? (
            <Checkbox
              checked={selectedDocumentIds.indexOf(params.row.id) !== -1}
              color="primary"
              onClick={(e) => e.stopPropagation()}
              onChange={(event) => handleOnCheckboxChange(event, params.row.id)}
              sx={{ flexShrink: 0 }}
            />
          ) : undefined,
      },
      ...tableViewColDef,
    ] as GridColDef[];
  }, [selectedDocumentIds, handleOnCheckboxChange]);

  return useMemo(() => {
    return (
      <DataGrid
        rows={sdocs ? sdocs : []}
        columns={columns}
        initialState={{
          pagination: {
            paginationModel: {
              page: paginationModel.page,
              pageSize: paginationModel.pageSize,
            },
          },
        }}
        paginationModel={paginationModel}
        onRowClick={(data) => handleResultClick(data.row)}
        disableRowSelectionOnClick
        getRowHeight={() => 100}
        checkboxSelection={false}
        hideFooter
        slots={{
          toolbar: GridToolbar,
        }}
        slotProps={{
          row: {
            onContextMenu: (event: React.MouseEvent<HTMLDivElement>) =>
              handleOnContextMenu
                ? handleOnContextMenu(Number((event.currentTarget as HTMLDivElement).getAttribute("data-id")))(event)
                : undefined,
          },
          toolbar: {
            sx: {
              color: "success.main",
            },
          },
        }}
        sx={{
          bgcolor: "background.paper",
          boxShadow: 10,
          flex: 1,
          "&.MuiDataGrid-root--densityCompact .MuiDataGrid-cell": { py: "8px" },
          "&.MuiDataGrid-root--densityStandard .MuiDataGrid-cell": { py: "15px" },
          "&.MuiDataGrid-root--densityComfortable .MuiDataGrid-cell": { py: "22px" },
          "&.MuiDataGrid-root .MuiDataGrid-columnHeader:focus, &.MuiDataGrid-root .MuiDataGrid-cell:focus-within": {
            outline: "none",
          },
        }}
      />
    );
  }, [sdocs, columns, paginationModel, handleOnContextMenu, handleResultClick]);
}
