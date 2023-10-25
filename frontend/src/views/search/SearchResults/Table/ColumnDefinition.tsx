import { ListItem, Stack, Tab, Tabs, Typography } from "@mui/material";
import { GridValueGetterParams } from "@mui/x-data-grid";
import { DocType, DocumentTagRead } from "../../../../api/openapi";
import SearchResultTag from "../SearchResultTag";
import { docTypeToIcon } from "../../../../features/DocumentExplorer/docTypeToIcon";
import DocStatusToIcon from "./DocStatusToIcon";

const EMPTY_TOKEN = "-";
export const tableViewColDef = [
  {
    field: "name",
    headerName: "Document Name",
    minWidth: 400,
    flex: 1,
    editable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return (
        data.row.metadata
          .find((metadata: any) => metadata.key === "name")
          .value.toString()
          .charAt(0)
          .toUpperCase() +
        data.row.metadata
          .find((metadata: any) => metadata.key === "name")
          .value.toString()
          .slice(1)
      );
    },
  },
  {
    field: "created",
    headerName: "Created",
    minWidth: 250,
    flex: 1,
    editable: false,
  },
  {
    field: "updated",
    headerName: "Last Updated",
    minWidth: 250,
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
      // <Tabs
      //   value={false}
      //   variant="scrollable"
      //   scrollButtons={true}
      //   TabScrollButtonProps={{
      //     sx: {
      //       width: "1em",
      //       "&.Mui-disabled": {
      //         width: 0,
      //       },
      //       transition: "width 0.5s",
      //     },
      //   }}
      //   sx={{ pr: 2 }}
      //   TabIndicatorProps={{ hidden: true }}
      // >
      //   <Tab
      //     sx={{ pl: 0 }}
      //     label={
      //       <ListItem>
      //         {
      data.row.tags.length > 0 ? (
        <Stack direction={"row"} spacing={0.2} overflow={"auto"}>
          {data.row.tags.map((tag: DocumentTagRead) => {
            return <SearchResultTag key={tag.id} tagId={tag.id} />;
          })}
        </Stack>
      ) : (
        <Typography align="center">{EMPTY_TOKEN}</Typography>
      ),
    //         }
    //       </ListItem>
    //     }
    //   />
    // </Tabs>
  },
  {
    field: "memos",
    headerName: "Memos",
    minWidth: 110,
    flex: 1,
    editable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.memos.length;
    },
  },
  {
    field: "doctype",
    headerName: "DocType",
    minWidth: 100,
    flex: 1,
    editable: false,
    sortable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.doctype;
    },
    renderCell: (data: any) => {
      return docTypeToIcon[data.row.doctype as DocType];
    },
  },
  {
    field: "content",
    headerName: "Content",
    minWidth: 300,
    flex: 1,
    editable: false,
  },
  {
    field: "status",
    headerName: "Status",
    minWidth: 100,
    flex: 1,
    editable: false,
    sortable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.status;
    },
    renderCell: (data: any) => {
      return <DocStatusToIcon docStatus={data.row.status} />;
    },
  },

  {
    field: "links",
    headerName: "Linked Documents",
    minWidth: 150,
    flex: 1,
    editable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.links.length;
    },
  },
  {
    field: "metadata.filename",
    headerName: "Filename",
    minWidth: 400,
    flex: 1,
    editable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.metadata.find((metadata: any) => metadata.key === "file_name")
        ? data.row.metadata.find((metadata: any) => metadata.key === "file_name").value
        : EMPTY_TOKEN;
    },
  },
  {
    field: "metadata.width",
    headerName: "Width",
    minWidth: 100,
    flex: 1,
    editable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.metadata.find((metadata: any) => metadata.key === "width")
        ? data.row.metadata.find((metadata: any) => metadata.key === "width").value
        : EMPTY_TOKEN;
    },
  },
  {
    field: "metadata.height",
    headerName: "Height",
    minWidth: 100,
    flex: 1,
    editable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.metadata.find((metadata: any) => metadata.key === "height")
        ? data.row.metadata.find((metadata: any) => metadata.key === "height").value
        : EMPTY_TOKEN;
    },
  },
  {
    field: "metadata.format",
    headerName: "Format",
    minWidth: 100,
    flex: 1,
    editable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.metadata.find((metadata: any) => metadata.key === "format")
        ? data.row.metadata.find((metadata: any) => metadata.key === "format").value
        : EMPTY_TOKEN;
    },
  },
  {
    field: "metadata.mode",
    headerName: "Mode",
    minWidth: 100,
    flex: 1,
    editable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.metadata.find((metadata: any) => metadata.key === "mode")
        ? data.row.metadata.find((metadata: any) => metadata.key === "mode").value
        : EMPTY_TOKEN;
    },
  },
  {
    field: "metadata.caption",
    headerName: "Caption",
    minWidth: 250,
    flex: 1,
    editable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.metadata.find((metadata: any) => metadata.key === "caption")
        ? data.row.metadata.find((metadata: any) => metadata.key === "caption").value
        : EMPTY_TOKEN;
    },
  },
  {
    field: "metadata.url",
    headerName: "Url",
    minWidth: 400,
    flex: 1,
    editable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.metadata.find((metadata: any) => metadata.key === "url")
        ? data.row.metadata.find((metadata: any) => metadata.key === "url").value
        : EMPTY_TOKEN;
    },
  },
  {
    field: "metadata.language",
    headerName: "Language",
    minWidth: 100,
    flex: 1,
    editable: false,
    valueGetter: (data: GridValueGetterParams) => {
      return data.row.metadata.find((metadata: any) => metadata.key === "language")
        ? data.row.metadata.find((metadata: any) => metadata.key === "language").value
        : EMPTY_TOKEN;
    },
  },
];
