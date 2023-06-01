import ArticleIcon from "@mui/icons-material/Article";
import ImageIcon from "@mui/icons-material/Image";
import LabelIcon from "@mui/icons-material/Label";
import {
  AppBar,
  Box,
  BoxProps,
  FormControl,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemProps,
  ListItemText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack,
  Toolbar,
  Tooltip,
} from "@mui/material";
import Typography from "@mui/material/Typography";
import { useVirtualizer } from "@tanstack/react-virtual";
import * as React from "react";
import { useCallback, useRef, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import ProjectHooks from "../../api/ProjectHooks";
import SdocHooks from "../../api/SdocHooks";
import SearchHooks from "../../api/SearchHooks";
import { AttachedObjectType, DocType } from "../../api/openapi";
import { ContextMenuPosition } from "../../components/ContextMenu/ContextMenuPosition";
import DocumentNavigation from "../../components/DocumentNavigation";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { AnnoActions } from "../../views/annotation/annoSlice";
import MemoButton from "../Memo/MemoButton";
import DocumentExplorerContextMenu from "./DocumentExplorerContextMenu";

function DocumentExplorer({ ...props }: BoxProps) {
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

  const containerRef: React.MutableRefObject<HTMLDivElement | null> = useRef(null);
  // The virtualizer
  const rowVirtualizer = useVirtualizer({
    count: sdocs.data?.length || 0,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
  });

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
    <Box className="myFlexContainer" {...props}>
      <AppBar
        position="relative"
        className="myFlexFitContentContainer"
        variant="outlined"
        elevation={0}
        sx={{
          backgroundColor: (theme) => theme.palette.background.paper,
          zIndex: (theme) => theme.zIndex.appBar,
          color: (theme) => theme.palette.text.primary,
          borderTop: 0,
          borderBottom: 1,
          borderLeft: 0,
          borderRight: 0,
          borderColor: "divider",
        }}
      >
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
        <div ref={containerRef} className="myFlexFillAllContainer">
          {sdocs.data.length === 0 && <div>No documents found...</div>}
          {sdocs.data.length > 0 && (
            <List
              style={{
                whiteSpace: "nowrap",
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                let sId = sdocs.data[virtualItem.index];
                return (
                  <DocumentExplorerListItem
                    key={virtualItem.key}
                    sdocId={sId}
                    selectedSdocId={parseInt(sdocId || "")}
                    onContextMenu={openContextMenu(sId)}
                    style={{
                      height: 48,
                      position: "absolute",
                      top: 0,
                      left: 0,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  />
                );
              })}
            </List>
          )}
        </div>
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
    </Box>
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
        className="myShowMoreContainer"
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
