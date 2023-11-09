import { Stack, Typography } from "@mui/material";
import { GridColDef, GridValueGetterParams } from "@mui/x-data-grid";
import { ImageSimilaritySearchResults } from "../../../../api/SearchHooks";
import { DocumentTagRead, SourceDocumentReadAll } from "../../../../api/openapi";
import SearchResultTag from "../SearchResultTag";
import ThumbnailURL from "./ThumbnailURL";

const EMPTY_TOKEN = "-";

export interface ImageSimResult {
  id: number;
  sdocId: number;
  sdoc: SourceDocumentReadAll | undefined;
  score: number;
}

export const getImageSimilaritySearchTableData = (
  searchResults: ImageSimilaritySearchResults,
  sdocs: SourceDocumentReadAll[]
) => {
  const sdocId2SdocMap = sdocs.reduce((map, sdoc) => {
    map[sdoc.id] = sdoc;
    return map;
  }, {} as Record<number, SourceDocumentReadAll>);

  return searchResults.getResults().map((simSearchHit, idx) => {
    return {
      id: idx,
      sdocId: simSearchHit.sdoc_id,
      sdoc: sdocId2SdocMap[simSearchHit.sdoc_id],
      score: simSearchHit.score,
    };
  });
};

export const imageSimTableViewColDef: GridColDef[] = [
  {
    field: "blank",
    headerName: "",
    width: 5,
    editable: false,
  },
  {
    field: "name",
    headerName: "Document Name",
    minWidth: 400,
    flex: 1,
    editable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.sdoc
        ? data.row.sdoc.metadata
            .find((metadata: any) => metadata.key === "name")
            .value.toString()
            .charAt(0)
            .toUpperCase() +
            data.row.sdoc.metadata
              .find((metadata: any) => metadata.key === "name")
              .value.toString()
              .slice(1)
        : EMPTY_TOKEN;
    },
  },
  {
    field: "thumbnailURLs",
    headerName: "Thumbnail URLs",
    minWidth: 600,
    flex: 1,
    editable: false,
    renderCell: (data: any) => {
      return <ThumbnailURL sdocId={data.row.sdocId} />;
    },
  },
  {
    field: "tags",
    headerName: "Tags",
    minWidth: 300,
    flex: 1,
    editable: false,
    sortable: false,
    filterable: false,
    renderCell: (data: any) =>
      data.row.sdoc && data.row.sdoc.tags ? (
        data.row.sdoc.tags.length > 0 ? (
          <Stack direction={"row"} spacing={0.2} overflow={"auto"}>
            {data.row.sdoc.tags.map((tag: DocumentTagRead) => {
              return <SearchResultTag key={tag.id} tagId={tag.id} />;
            })}
          </Stack>
        ) : (
          <Typography align="center">{EMPTY_TOKEN}</Typography>
        )
      ) : (
        EMPTY_TOKEN
      ),
  },
];
