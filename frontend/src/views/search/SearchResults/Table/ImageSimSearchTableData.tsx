import { Stack, Typography } from "@mui/material";
import { GridColDef, GridValueGetterParams } from "@mui/x-data-grid";
import { DocType, DocumentTagRead, SourceDocumentReadAll } from "../../../../api/openapi";
import SearchResultTag from "../SearchResultTag";
import { docTypeToIcon } from "../../../../features/DocumentExplorer/docTypeToIcon";
import DocStatusToIcon from "./DocStatusToIcon";
import { UseQueryResult } from "@tanstack/react-query";
import { ImageSimilaritySearchResults, SearchResults } from "../../../../api/SearchHooks";
import { ThumbnailURL } from "../Common/ThumbnailURL";

const EMPTY_TOKEN = "-";

export interface imageSimResult {
  sdocId: number;
  sdoc: SourceDocumentReadAll | undefined;
  thumbnailURL: string;
}

export function ImageSimilaritySearchTableData(
  searchResults: ImageSimilaritySearchResults,
  sdocs: SourceDocumentReadAll[]
) {
  let id = 0;
  let imageSimResults: imageSimResult[] = [];
  const resEntries = Array.from(searchResults.getResults().entries());
  const thumbnailURLs = resEntries.map(([sdocId, hits]) => {
    //hits are map of result values per document
    const thumbnailURL = ThumbnailURL(hits.sdoc_id);
    return [hits.sdoc_id, thumbnailURL];
  });
  imageSimResults = thumbnailURLs
    .filter(([sdocId, thumbnailURL]) => thumbnailURL !== "")
    .map(([sdocId, thumbnailURL]) => {
      id += 1;
      return {
        id: id,
        sdocId: sdocId as number,
        sdoc: sdocs?.find((sdoc) => sdoc.id === sdocId),
        thumbnailURL: thumbnailURL as string,
      };
    });
  return imageSimResults;
}

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
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.thumbnailURL;
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
  //   field: "created",
  //   headerName: "Created",
  //   minWidth: 250,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.sdoc ? data.row.sdoc.created : EMPTY_TOKEN;
  //   },
  // },
  // {
  //   field: "updated",
  //   headerName: "Last Updated",
  //   minWidth: 250,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.sdoc ? data.row.sdoc.updated : EMPTY_TOKEN;
  //   },
  // },
  // {
  //   field: "memos",
  //   headerName: "Memos",
  //   minWidth: 110,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.sdoc ? data.row.sdoc.memos.length : EMPTY_TOKEN;
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
  //     return data.row.sdoc ? data.row.sdoc.doctype : EMPTY_TOKEN;
  //   },
  //   renderCell: (data: any) => {
  //     return data.row.sdoc ? docTypeToIcon[data.row.sdoc.doctype as DocType] : EMPTY_TOKEN;
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
  //     return data.row.sdoc ? data.row.sdoc.status : EMPTY_TOKEN;
  //   },
  //   renderCell: (data: any) => {
  //     return data.row.sdoc ? <DocStatusToIcon docStatus={data.row.sdoc.status} /> : EMPTY_TOKEN;
  //   },
  // },

  // {
  //   field: "links",
  //   headerName: "Linked Documents",
  //   minWidth: 150,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.sdoc ? data.row.sdoc.links.length : EMPTY_TOKEN;
  //   },
  // },
  // {
  //   field: "metadata.filename",
  //   headerName: "Filename",
  //   minWidth: 400,
  //   flex: 1,
  //   editable: false,
  //   valueGetter: (data: GridValueGetterParams) => {
  //     return data.row.sdoc
  //       ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "file_name")
  //         ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "file_name").value
  //         : EMPTY_TOKEN
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
  //     return data.row.sdoc
  //       ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "width")
  //         ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "width").value
  //         : EMPTY_TOKEN
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
  //     return data.row.sdoc
  //       ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "height")
  //         ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "height").value
  //         : EMPTY_TOKEN
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
  //     return data.row.sdoc
  //       ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "format")
  //         ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "format").value
  //         : EMPTY_TOKEN
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
  //     return data.row.sdoc
  //       ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "mode")
  //         ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "mode").value
  //         : EMPTY_TOKEN
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
  //     return data.row.sdoc
  //       ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "caption")
  //         ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "caption").value
  //         : EMPTY_TOKEN
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
  //     return data.row.sdoc
  //       ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "url")
  //         ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "url").value
  //         : EMPTY_TOKEN
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
  //     return data.row.sdoc
  //       ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "language")
  //         ? data.row.sdoc.metadata.find((metadata: any) => metadata.key === "language").value
  //         : EMPTY_TOKEN
  //       : EMPTY_TOKEN;
  //   },
  // },
];
