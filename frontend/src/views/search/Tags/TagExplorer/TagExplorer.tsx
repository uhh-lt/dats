import StorageIcon from "@mui/icons-material/Storage";
import {
  BoxProps,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from "@mui/material";
import Box from "@mui/material/Box";
import React, { useState } from "react";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../../api/ProjectHooks";
import { ContextMenuPosition } from "../../../../components/ContextMenu/ContextMenuPosition";
import ExporterButton from "../../../../features/Exporter/ExporterButton";
import TagCreationButton from "../TagCreate/TagCreationButton";
import TagEditDialog from "../../../../features/CrudDialog/Tag/TagEditDialog";
import TagExplorerContextMenu from "./TagExplorerContextMenu";
import TagListItem from "./TagListItem";

interface TagSearchProps {
  handleAllDocumentsClick: () => void;
  handleNewDocumentsClick: () => void;
  handleTagClick: (tagId: number) => void;
  selectedTag: number | undefined;
}

function TagExplorer({
  handleAllDocumentsClick,
  handleNewDocumentsClick,
  handleTagClick,
  selectedTag,
  ...props
}: TagSearchProps & BoxProps) {
  // router
  const { projectId } = useParams() as { projectId: string };

  // queries
  // we handle all tags as if it were a list of ids! (even though it returns full tags!)
  const allTags = ProjectHooks.useGetAllTags(parseInt(projectId));

  // context menu
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const [contextMenuData, setContextMenuData] = useState<number>();
  const onContextMenu = (tagId: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuData(tagId);
  };

  return (
    <Box {...props} className="myFlexContainer">
      <List className="myFlexFitContentContainer">
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleAllDocumentsClick()}>
            <ListItemIcon>
              <StorageIcon />
            </ListItemIcon>
            <ListItemText primary="All documents" />
          </ListItemButton>
        </ListItem>

        {/* <ListItem disablePadding>
          <ListItemButton onClick={() => handleNewDocumentsClick()} disabled>
            <ListItemIcon>
              <DownloadIcon />
            </ListItemIcon>
            <ListItemText primary="New documents" />
          </ListItemButton>
        </ListItem> */}
      </List>

      <Typography
        variant="h6"
        component="div"
        sx={{ mt: 1, pl: 2 }}
        className="myShowMoreContainer myFlexFitContentContainer"
      >
        Tags:{" "}
        <span style={{ float: "right" }} className="myShowMoreMenu">
          <ExporterButton
            tooltip="Export tagset"
            exporterInfo={{ type: "Tagset", sdocId: -1, singleUser: false, users: [] }}
          />
        </span>
      </Typography>
      <List className="myFlexFillAllContainer">
        {allTags.isLoading && <div>Loading!</div>}
        {allTags.isError && <div>Error: {allTags.error.message}</div>}
        {allTags.isSuccess && (
          <>
            {allTags.data.map((tag) => (
              <TagListItem
                key={tag.id}
                tagId={tag.id}
                selectedTagId={selectedTag}
                handleClick={handleTagClick}
                onContextMenu={onContextMenu(tag.id)}
              />
            ))}
          </>
        )}
      </List>
      <List>
        <Divider />
        <TagCreationButton tagName={""} />
        {/* <TagManageButton /> */}
      </List>
      <TagEditDialog />
      <TagExplorerContextMenu
        tagId={contextMenuData}
        position={contextMenuPosition}
        handleClose={() => setContextMenuPosition(null)}
      />
    </Box>
  );
}

export default TagExplorer;
