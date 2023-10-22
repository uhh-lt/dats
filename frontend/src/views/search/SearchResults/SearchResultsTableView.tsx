import { DataGrid, GridColDef, GridToolbar, GridValueGetterParams } from "@mui/x-data-grid";

import {
  Button,
  Card,
  CardContent,
  Checkbox,
  Link,
  ListItem,
  Stack,
  Tab,
  Tabs,
  Tooltip,
  Typography,
} from "@mui/material";
import * as React from "react";
import { useMemo } from "react";
import { SearchResults } from "../../../api/SearchHooks";
import { AttachedObjectType, DocType, DocumentTagRead, SourceDocumentRead } from "../../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import "./SearchResults.css";
import SdocHooks from "../../../api/SdocHooks";
import SearchResultTag from "./SearchResultTag";
import { docTypeToIcon } from "../../../features/DocumentExplorer/docTypeToIcon";
import DocStatusToIcon from "./Table/DocStatusToIcon";
import { EMPTY_TOKEN } from "../../../utils/GlobalConstants";
import MemoAPI from "../../../features/Memo/MemoAPI";
import { useResizeDetector } from "react-resize-detector";
import { SearchActions } from "../searchSlice";

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
export let dataGridRef = React.createRef<HTMLDivElement>();
export default function SearchResultsTableView({
  searchResults,
  handleResultClick,
  handleOnContextMenu,
  handleOnCheckboxChange,
}: SearchResultsTableViewProps) {
  const { width, height, ref } = useResizeDetector();
  const dispatch = useAppDispatch();

  const selectedDocumentIds = useAppSelector((state) => state.search.selectedDocumentIds);

  const columns: GridColDef[] = useMemo(() => {
    const handleMemoClick = (
      event: React.MouseEvent<HTMLButtonElement, MouseEvent>,
      attachedObjectType: AttachedObjectType,
      attachedObjectId?: number,
      memoId?: number
    ) => {
      event.stopPropagation();
      MemoAPI.openMemo({ memoId, attachedObjectType, attachedObjectId });
    };

    return [
      {
        field: "select",
        headerName: "",
        minWidth: 25,
        editable: false,
        renderCell: (params) =>
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
        renderCell: (data) => (
          <Link
            component={"button"}
            variant={"body2"}
            onClick={() => handleResultClick(data.row)}
            sx={{ width: "100%" }}
            fontWeight={500}
            textAlign={"left"}
          >
            {data.row.metadata
              .find((metadata: any) => metadata.key === "name")
              .value.toString()
              .charAt(0)
              .toUpperCase() +
              data.row.metadata
                .find((metadata: any) => metadata.key === "name")
                .value.toString()
                .slice(1)}
          </Link>
        ),
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
        filterable: false,
        renderCell: (data) => (
          <Tabs
            value={false}
            variant="scrollable"
            scrollButtons={true}
            TabScrollButtonProps={{
              sx: {
                width: "1em",
                "&.Mui-disabled": {
                  width: 0,
                },
                transition: "width 0.5s",
              },
            }}
            sx={{ pr: 2 }}
            TabIndicatorProps={{ hidden: true }}
          >
            <Tab
              sx={{ pl: 0 }}
              label={
                <ListItem>
                  {data.row.tags.length > 0 ? (
                    <Stack direction={"row"} spacing={0.2}>
                      {data.row.tags.map((tag: DocumentTagRead) => {
                        return <SearchResultTag key={tag.id} tagId={tag.id} />;
                      })}
                    </Stack>
                  ) : (
                    <Typography align="center">{EMPTY_TOKEN}</Typography>
                  )}
                </ListItem>
              }
            />
          </Tabs>
        ),
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
        renderCell: (data) => (
          <Tooltip title={data.row.memos.length > 0 ? "Update Memo" : "Create Memo"}>
            <Button
              variant="text"
              focusRipple={false}
              onClick={(event) =>
                data.row.memos.length > 0
                  ? handleMemoClick(
                      event,
                      data.row.memos[0].attached_object_type,
                      data.row.memos[0].attached_object_id,
                      data.row.memos[0].id
                    )
                  : handleMemoClick(event, AttachedObjectType.SOURCE_DOCUMENT, data.row.id)
              }
              sx={{ textDecoration: "underline" }}
            >
              {data.row.memos.length}
            </Button>
          </Tooltip>
        ),
      },
      {
        field: "doctype",
        headerName: "DocType",
        minWidth: 100,
        flex: 1,
        editable: false,
        valueGetter: (data: GridValueGetterParams) => {
          return data.row.doctype;
        },
        renderCell: (data) => {
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
        valueGetter: (data: GridValueGetterParams) => {
          return data.row.status;
        },
        renderCell: (data) => {
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
  }, [selectedDocumentIds, handleOnCheckboxChange, handleResultClick]);
  const sdocIds = searchResults.getSearchResultSDocIds();
  const sdocs = SdocHooks.useGetAllDocumentDataBulk(sdocIds).data;

  const paginationModel = useAppSelector((state) => state.search.tableViewPaginationModel);
  const estimatedRowHeight = 100;
  React.useLayoutEffect(() => {
    const sdocIdsLen = sdocIds.length;

    if (width && height) {
      let numRows = Math.floor(height / estimatedRowHeight);
      numRows = height - numRows * estimatedRowHeight - (numRows - 1) * 15 > 0 ? numRows : numRows - 1;
      dispatch(SearchActions.setRowsPerPage(numRows));
      dispatch(
        SearchActions.setTableViewPaginationModel({
          page: numRows >= sdocIdsLen ? 0 : paginationModel.page,
          pageSize: numRows,
        })
      );

      return;
    }
  }, [dispatch, width, height, searchResults, paginationModel.page, sdocIds]);

  return useMemo(() => {
    return (
      <Card sx={{ height: "100%", width: "100%" }}>
        <CardContent sx={{ height: "100%", width: "100%" }}>
          <DataGrid
            ref={ref}
            slots={{
              toolbar: GridToolbar,
            }}
            autoPageSize
            initialState={{
              pagination: {
                paginationModel: {
                  page: paginationModel.page,
                  pageSize: paginationModel.pageSize,
                },
              },
            }}
            getRowHeight={() => "auto"}
            // getEstimatedRowHeight={() => estimatedRowHeight}
            rows={sdocs ? sdocs : []}
            columns={columns}
            pagination
            paginationModel={paginationModel}
            checkboxSelection={false}
            hideFooter={true}
            disableRowSelectionOnClick
            slotProps={{
              row: {
                onContextMenu: (event: React.MouseEvent<HTMLDivElement>) =>
                  handleOnContextMenu
                    ? handleOnContextMenu(Number((event.currentTarget as HTMLDivElement).getAttribute("data-id")))(
                        event
                      )
                    : undefined,
              },
              toolbar: {
                sx: {
                  color: "success.main",
                },
              },
              footer: {
                newPage: paginationModel.page,
              },
            }}
            sx={{
              boxShadow: 10,
              flex: 1,
              "& .MuiDataGrid-cell:focus-within": {
                outline: "none",
              },
              "&.MuiDataGrid-root--densityCompact .MuiDataGrid-cell": { py: "8px" },
              "&.MuiDataGrid-root--densityStandard .MuiDataGrid-cell": { py: "15px" },
              "&.MuiDataGrid-root--densityComfortable .MuiDataGrid-cell": { py: "22px" },
            }}
          />
        </CardContent>
      </Card>
    );
  }, [sdocs, columns, handleOnContextMenu, paginationModel, ref]);
}
