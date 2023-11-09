import { DataGrid, GridColDef, GridToolbar, GridValueGetterParams } from "@mui/x-data-grid";

import { Checkbox } from "@mui/material";
import * as React from "react";
import { useMemo } from "react";
import SdocHooks from "../../../api/SdocHooks";
import {
  ImageSimilaritySearchResults,
  LexicalSearchResults,
  SearchResults,
  SentenceSimilaritySearchResults,
} from "../../../api/SearchHooks";
import { SourceDocumentRead, SourceDocumentReadAll } from "../../../api/openapi";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import "./SearchResults.css";

import { defaultTableViewColDef } from "./Table/DefaultColumnDefinition";
import {
  ImageSimResult,
  getImageSimilaritySearchTableData,
  imageSimTableViewColDef,
} from "./Table/ImageSimSearchTableData";
import { lexicalTableViewColDef } from "./Table/LexicalSearchTableData";
import {
  getSentenceSimilaritySearchTableData,
  SentenceSimResult,
  sentenceSimTableViewColDef,
} from "./Table/SentenceSimSearchTableData";

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

export default function SearchResultsTableView(props: SearchResultsTableViewProps) {
  const sdocIds = props.searchResults.getSearchResultSDocIds();
  const sdocs = SdocHooks.useGetAllDocumentDataBulk(sdocIds);

  if (sdocs.isSuccess) {
    return <SearchResultsTableViewWithData sdocs={sdocs.data} {...props} />;
  } else {
    return <>Loading!</>;
  }
}

interface SearchResultsTableViewWithDataProps extends SearchResultsTableViewProps {
  sdocs: SourceDocumentReadAll[];
}

function SearchResultsTableViewWithData({
  sdocs,
  searchResults,
  handleResultClick,
  handleOnContextMenu,
  handleOnCheckboxChange,
}: SearchResultsTableViewWithDataProps) {
  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);
  const paginationModel = useAppSelector((state) => state.search.tableViewPaginationModel);

  const { columns, resultType, rowData } = useMemo(() => {
    let tableViewColDef: GridColDef[] = defaultTableViewColDef;
    let resultType = "";
    let rowData: SourceDocumentReadAll[] | SentenceSimResult[] | ImageSimResult[] = sdocs;

    if (searchResults instanceof LexicalSearchResults) {
      resultType = "lexical";
      tableViewColDef = lexicalTableViewColDef;
    } else if (searchResults instanceof SentenceSimilaritySearchResults) {
      resultType = "sentenceSim";
      const sentenceSimTableData = getSentenceSimilaritySearchTableData(searchResults, sdocs);
      rowData = sentenceSimTableData;
      tableViewColDef = sentenceSimTableViewColDef;
    } else if (searchResults instanceof ImageSimilaritySearchResults) {
      resultType = "imageSim";
      const imageSimTableData = getImageSimilaritySearchTableData(searchResults, sdocs);
      rowData = imageSimTableData;
      tableViewColDef = imageSimTableViewColDef;
    }

    if (resultType === "lexical") {
      tableViewColDef = [
        handleOnCheckboxChange && {
          field: "select",
          headerName: "",
          minWidth: 25,
          editable: false,
          sortable: false,
          filterable: false,
          renderCell: (params: GridValueGetterParams) => (
            <Checkbox
              checked={selectedDocumentIds.indexOf(params.row.id) !== -1}
              color="primary"
              onClick={(e) => e.stopPropagation()}
              onChange={(event) => handleOnCheckboxChange(event, params.row.id)}
              sx={{ flexShrink: 0 }}
            />
          ),
        },
        ...tableViewColDef,
      ] as GridColDef[];
    }

    return { columns: tableViewColDef, resultType, rowData };
  }, [handleOnCheckboxChange, sdocs, searchResults, selectedDocumentIds]);

  return (
    <DataGrid
      key={resultType}
      rows={rowData}
      columns={columns}
      getRowHeight={() => 100}
      paginationModel={paginationModel}
      onRowClick={(data) => handleResultClick(resultType !== "lexical" ? data.row.sdoc : data.row)}
      disableRowSelectionOnClick
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
}
