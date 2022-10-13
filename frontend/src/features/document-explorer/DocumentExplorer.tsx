import * as React from "react";
import { useCallback, useState } from "react";
import Typography from "@mui/material/Typography";
import {
  AppBar,
  FormControl,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemProps,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Stack,
  Toolbar,
  Tooltip,
} from "@mui/material";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import ProjectHooks from "../../api/ProjectHooks";
import { Link as RouterLink, useParams } from "react-router-dom";
import SdocHooks from "../../api/SdocHooks";
import { AttachedObjectType, DocType } from "../../api/openapi";
import MemoButton from "../memo-dialog/MemoButton";
import DocumentNavigation from "../../components/DocumentNavigation";
import { AnnoActions } from "../../views/annotation/annoSlice";
import ArticleIcon from "@mui/icons-material/Article";
import ImageIcon from "@mui/icons-material/Image";
import { ContextMenuPosition } from "../../views/projects/ProjectContextMenu2";
import DocumentExplorerContextMenu from "./DocumentExplorerContextMenu";
import SearchHooks from "../../api/SearchHooks";
import LabelIcon from "@mui/icons-material/Label";

function DocumentExplorer({ ...props }) {
  // router
  const { projectId, sdocId } = useParams() as { projectId: string; sdocId: string | undefined };

  // global client state (redux)
  const selectedDocumentTag = useAppSelector((state) => state.annotations.selectedDocumentTagId);
  const dispatch = useAppDispatch();

  // server state (react query)
  const documentTags = ProjectHooks.useGetAllTags(parseInt(projectId));
  const sdocs = SearchHooks.useSearchDocumentsByProjectIdAndTagId(parseInt(projectId), selectedDocumentTag);

  // ui event handler
  const handleDocumentTagChange = (event: SelectChangeEvent) => {
    const tagId = event.target.value;
    dispatch(AnnoActions.setSelectedDocumentTagId(tagId !== "-1" ? parseInt(event.target.value) : undefined));
  };

  // context menu
  const [contextMenuData, setContextMenuData] = useState<number>();
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const openContextMenu = useCallback(
    (sdocId: number) => (event: React.MouseEvent) => {
      event.preventDefault();
      setContextMenuData(sdocId);
      setContextMenuPosition({ x: event.pageX, y: event.pageY });
    },
    []
  );
  const closeContextMenu = useCallback(() => {
    setContextMenuPosition(null);
  }, []);

  return (
    <Paper square className="myFlexContainer" {...props}>
      <AppBar position="relative" color="secondary" className="myFlexFitContentContainer">
        <Toolbar variant="dense">
          <Stack direction="row" sx={{ width: "100%", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="h6" color="inherit" component="div" className="overflow-ellipsis">
              Document Explorer
            </Typography>
            {documentTags.isLoading && <div>Loading!</div>}
            {documentTags.isError && <div>Error: {documentTags.error.message}</div>}
            {documentTags.isSuccess && (
              <FormControl size="small">
                <Select
                  sx={{ backgroundColor: "white" }}
                  value={selectedDocumentTag?.toString() || "-1"}
                  onChange={handleDocumentTagChange}
                  style={{}}
                  SelectDisplayProps={{ style: { display: "inline-flex", alignItems: "center" } }}
                >
                  <MenuItem value="-1">Select a tag...</MenuItem>
                  {documentTags.data.map((tag) => (
                    <MenuItem key={tag.id} value={tag.id.toString()}>
                      <LabelIcon fontSize="small" style={{ color: tag.color, marginRight: "8px" }} />
                      {tag.title}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <DocumentNavigation idsToNavigate={sdocs.data || []} searchPrefix={"../annotation/"} />
          </Stack>
        </Toolbar>
      </AppBar>
      {!selectedDocumentTag ? (
        <div>Please select a document tag above :)</div>
      ) : sdocs.isSuccess ? (
        <>
          {sdocs.data.length === 0 && <div>No documents found...</div>}
          {sdocs.data.length > 0 && (
            <List className="myFlexFillAllContainer">
              {sdocs.data.map((sId) => (
                <DocumentExplorerListItem
                  key={sId}
                  sdocId={sId}
                  selectedSdocId={parseInt(sdocId || "")}
                  onContextMenu={openContextMenu(sId)}
                />
              ))}
            </List>
          )}
        </>
      ) : sdocs.isError ? (
        <div>Error: {sdocs.error.message}</div>
      ) : (
        <div>Loading!</div>
      )}
      <DocumentExplorerContextMenu
        projectId={parseInt(projectId)}
        sdocId={contextMenuData}
        handleClose={closeContextMenu}
        position={contextMenuPosition}
      />
    </Paper>
  );
}

function DocumentExplorerListItem({
  sdocId,
  selectedSdocId,
  ...props
}: { sdocId: number; selectedSdocId: number } & ListItemProps) {
  const sdoc = SdocHooks.useGetDocumentNoContent(sdocId);

  const title = sdoc.isSuccess ? sdoc.data.filename : sdoc.isError ? sdoc.error.message : "Loading...";

  return (
    <Tooltip title={title} placement="top-start" enterDelay={500} followCursor>
      <ListItem
        key={sdocId}
        secondaryAction={
          <div className="myShowMoreMenu">
            <MemoButton edge="end" attachedObjectId={sdocId} attachedObjectType={AttachedObjectType.SOURCE_DOCUMENT} />
          </div>
        }
        disablePadding
        className="myShowMoreListItem"
        {...props}
      >
        <ListItemButton component={RouterLink} to={`../annotation/${sdocId}`} selected={selectedSdocId === sdocId}>
          {sdoc.isSuccess && (
            <ListItemIcon>{sdoc.data.doctype === DocType.TEXT ? <ArticleIcon /> : <ImageIcon />}</ListItemIcon>
          )}
          <ListItemText primary={title} sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} />
        </ListItemButton>
      </ListItem>
    </Tooltip>
  );
}

export default DocumentExplorer;
