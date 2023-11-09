import { Stack, Typography } from "@mui/material";
import { GridValueGetterParams } from "@mui/x-data-grid";
import { DocType, DocumentTagRead, SourceDocumentReadAll } from "../../../../api/openapi";
import SearchResultTag from "../SearchResultTag";
import { docTypeToIcon } from "../../../../features/DocumentExplorer/docTypeToIcon";
import DocStatusToIcon from "./DocStatusToIcon";
import SdocHooks from "../../../../api/SdocHooks";
import { ContextSentences } from "../Common/ContextSentences";
import { SentenceSimilaritySearchResults } from "../../../../api/SearchHooks";
import { ContextSentence } from "../../../../utils/GlobalConstants";

const EMPTY_TOKEN = "-";

export interface sentenceSimResult {
  sdocId: number;
  sdoc: SourceDocumentReadAll | undefined;
  context_sentences: ContextSentence | [];
}

export function SentenceSimilaritySearchTableData(
  searchResults: SentenceSimilaritySearchResults,
  sdocs: SourceDocumentReadAll[]
) {
  let id = 0;
  let sentenceSimResults: sentenceSimResult[] = [];
  const resEntries = Array.from(searchResults.getResults().entries());
  sentenceSimResults = resEntries
    .map(([sdocId, hits]) => {
      const context_sentence = ContextSentences({ sdocId, hits });

      console.log("context sentence", context_sentence);
      return context_sentence
        .filter((sentence) => {
          return sentence;
        })
        .map((sentence) => {
          id += 1;
          return {
            id: id,
            sdocId: sdocId,
            sdoc: sdocs?.find((sdoc) => sdoc.id === sdocId),
            context_sentences: sentence,
          };
        });
    })
    .flat();

  return sentenceSimResults;
}

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
    field: "context_sentence",
    headerName: "Context Sentence",
    minWidth: 400,
    flex: 1,
    editable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.context_sentences.text;
    },
  },
  {
    field: "score",
    headerName: "Score",
    minWidth: 400,
    flex: 1,
    editable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.context_sentences.score;
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
  // {
  //   field: "id",
  //   headerName: "id",
  //   minWidth: 400,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.id;
  //   },
  // },
  // {
  //   field: "sdoc_id",
  //   headerName: "Document ID",
  //   minWidth: 400,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.sdocId;
  //   },
  // },
  // {
  //   field: "created",
  //   headerName: "Created",
  //   minWidth: 250,
  //   flex: 1,
  //   editable: false,
  // },
  // {
  //   field: "updated",
  //   headerName: "Last Updated",
  //   minWidth: 250,
  //   flex: 1,
  //   editable: false,
  // },

  // {
  //   field: "memos",
  //   headerName: "Memos",
  //   minWidth: 110,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.memos.length;
  //   },
  // },
  // {
  //   field: "doctype",
  //   headerName: "DocType",
  //   minWidth: 100,
  //   flex: 1,
  //   editable: false,
  //   sortable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.doctype;
  //   },
  //   renderCell: (data: any) => {
  //     return docTypeToIcon[data.row.doctype as DocType];
  //   },
  // },
  // {
  //   field: "content",
  //   headerName: "Content",
  //   minWidth: 300,
  //   flex: 1,
  //   editable: false,
  // },
  // {
  //   field: "status",
  //   headerName: "Status",
  //   minWidth: 100,
  //   flex: 1,
  //   editable: false,
  //   sortable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.status;
  //   },
  //   renderCell: (data: any) => {
  //     return <DocStatusToIcon docStatus={data.row.status} />;
  //   },
  // },

  // {
  //   field: "links",
  //   headerName: "Linked Documents",
  //   minWidth: 150,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.links.length;
  //   },
  // },
  // {
  //   field: "metadata.filename",
  //   headerName: "Filename",
  //   minWidth: 400,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.metadata.find((metadata: any) => metadata.key === "file_name")
  //       ? data.row.metadata.find((metadata: any) => metadata.key === "file_name").value
  //       : EMPTY_TOKEN;
  //   },
  // },
  // {
  //   field: "metadata.width",
  //   headerName: "Width",
  //   minWidth: 100,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.metadata.find((metadata: any) => metadata.key === "width")
  //       ? data.row.metadata.find((metadata: any) => metadata.key === "width").value
  //       : EMPTY_TOKEN;
  //   },
  // },
  // {
  //   field: "metadata.height",
  //   headerName: "Height",
  //   minWidth: 100,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.metadata.find((metadata: any) => metadata.key === "height")
  //       ? data.row.metadata.find((metadata: any) => metadata.key === "height").value
  //       : EMPTY_TOKEN;
  //   },
  // },
  // {
  //   field: "metadata.format",
  //   headerName: "Format",
  //   minWidth: 100,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.metadata.find((metadata: any) => metadata.key === "format")
  //       ? data.row.metadata.find((metadata: any) => metadata.key === "format").value
  //       : EMPTY_TOKEN;
  //   },
  // },
  // {
  //   field: "metadata.mode",
  //   headerName: "Mode",
  //   minWidth: 100,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.metadata.find((metadata: any) => metadata.key === "mode")
  //       ? data.row.metadata.find((metadata: any) => metadata.key === "mode").value
  //       : EMPTY_TOKEN;
  //   },
  // },
  // {
  //   field: "metadata.caption",
  //   headerName: "Caption",
  //   minWidth: 250,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.metadata.find((metadata: any) => metadata.key === "caption")
  //       ? data.row.metadata.find((metadata: any) => metadata.key === "caption").value
  //       : EMPTY_TOKEN;
  //   },
  // },
  // {
  //   field: "metadata.url",
  //   headerName: "Url",
  //   minWidth: 400,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.metadata.find((metadata: any) => metadata.key === "url")
  //       ? data.row.metadata.find((metadata: any) => metadata.key === "url").value
  //       : EMPTY_TOKEN;
  //   },
  // },
  // {
  //   field: "metadata.language",
  //   headerName: "Language",
  //   minWidth: 100,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.metadata.find((metadata: any) => metadata.key === "language")
  //       ? data.row.metadata.find((metadata: any) => metadata.key === "language").value
  //       : EMPTY_TOKEN;
  //   },
  // },
];
