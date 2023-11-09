import { DataGrid, GridColDef, GridToolbar, GridValueGetterParams } from "@mui/x-data-grid";

import { Checkbox } from "@mui/material";
import * as React from "react";
import { useMemo } from "react";
import {
  ImageSimilaritySearchResults,
  LexicalSearchResults,
  SearchResults,
  SentenceSimilaritySearchResults,
} from "../../../api/SearchHooks";
import { SourceDocumentRead, SourceDocumentReadAll } from "../../../api/openapi";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import "./SearchResults.css";
import SdocHooks from "../../../api/SdocHooks";

import { defaultTableViewColDef } from "./Table/DefaultColumnDefinition";
import { lexicalTableViewColDef } from "./Table/LexicalSearchTableData";
import {
  SentenceSimilaritySearchTableData,
  sentenceSimResult,
  sentenceSimTableViewColDef,
} from "./Table/SentenceSimSearchTableData";
import {
  ImageSimilaritySearchTableData,
  imageSimResult,
  imageSimTableViewColDef,
} from "./Table/ImageSimSearchTableData";
import { ContextSentences } from "./Common/ContextSentences";
import { ContextSentence } from "../../../utils/GlobalConstants";
import { ThumbnailURL } from "./Common/ThumbnailURL";
import { UseQueryResult } from "@tanstack/react-query";
import { image } from "d3";
import { result } from "lodash";

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

  let tableViewColDef: GridColDef[] = defaultTableViewColDef;
  let resultType = "";

  let rowData: SourceDocumentReadAll[] | sentenceSimResult[] | imageSimResult[] = sdocs!;
  if (searchResults instanceof LexicalSearchResults) {
    resultType = "lexical";
    tableViewColDef = lexicalTableViewColDef;
  } else if (searchResults instanceof SentenceSimilaritySearchResults) {
    resultType = "sentenceSim";
    const sentenceSimTableData = SentenceSimilaritySearchTableData(searchResults, sdocs!);
    rowData = sentenceSimTableData;
    tableViewColDef = sentenceSimTableViewColDef;
  } else if (searchResults instanceof ImageSimilaritySearchResults) {
    resultType = "imageSim";
    const imageSimTableData = ImageSimilaritySearchTableData(searchResults, sdocs!);
    rowData = imageSimTableData;
    tableViewColDef = imageSimTableViewColDef;
  }

  const columns: GridColDef[] = useMemo(() => {
    return resultType !== "lexical"
      ? [...tableViewColDef]
      : ([
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
        ] as GridColDef[]);
  }, [selectedDocumentIds, resultType, tableViewColDef, handleOnCheckboxChange]);

  return useMemo(() => {
    return resultType !== "" ? (
      <DataGrid
        rows={rowData ? rowData : []}
        columns={columns}
        getRowHeight={() => 100}
        // getRowHeight={() => "auto"}
        // getEstimatedRowHeight={() => 100}
        initialState={{
          pagination: {
            paginationModel: {
              page: paginationModel.page,
              pageSize: paginationModel.pageSize,
            },
          },
        }}
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
    ) : (
      <>Search Result Type is not supported :(</>
    );
  }, [columns, paginationModel, rowData, resultType, handleOnContextMenu, handleResultClick]);
}
