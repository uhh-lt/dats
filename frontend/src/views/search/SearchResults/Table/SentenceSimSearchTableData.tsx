import { Stack, Typography } from "@mui/material";
import { GridValueGetterParams } from "@mui/x-data-grid";
import { SentenceSimilaritySearchResults } from "../../../../api/SearchHooks";
import { DocumentTagRead, SourceDocumentReadAll } from "../../../../api/openapi";
import SearchResultTag from "../SearchResultTag";

const EMPTY_TOKEN = "-";

export interface SentenceSimResult {
  id: number;
  sdocId: number;
  sdoc: SourceDocumentReadAll | undefined;
  score: number;
}

export const getSentenceSimilaritySearchTableData = (
  searchResults: SentenceSimilaritySearchResults,
  sdocs: SourceDocumentReadAll[]
) => {
  const sdocId2SdocMap = sdocs.reduce((map, sdoc) => {
    map[sdoc.id] = sdoc;
    return map;
  }, {} as Record<number, SourceDocumentReadAll>);

  const sentenceHits = Array.from(searchResults.getResults().values()).flat();

  return sentenceHits.map((sentenceHit, idx) => {
    return {
      id: idx,
      sdocId: sentenceHit.sdoc_id,
      sdoc: sdocId2SdocMap[sentenceHit.sdoc_id],
      score: sentenceHit.score,
    };
  });
};

export const sentenceSimTableViewColDef = [
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
      return data.row.sdoc.filename;
    },
  },
  {
    field: "score",
    headerName: "Score",
    minWidth: 400,
    flex: 1,
    editable: false,
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
