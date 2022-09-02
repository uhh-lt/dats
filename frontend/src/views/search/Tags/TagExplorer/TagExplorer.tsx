import { Divider, List, ListItem, ListItemButton, ListItemIcon, ListItemText, ListProps } from "@mui/material";
import React from "react";
import TagCreationButton from "../TagCreate/TagCreationButton";
import TagManageButton from "../TagManage/TagManageButton";
import { useParams } from "react-router-dom";
import ProjectHooks from "../../../../api/ProjectHooks";
import TagListItem from "./TagListItem";
import TagEditDialog from "../TagEdit/TagEditDialog";
import StorageIcon from "@mui/icons-material/Storage";
import DownloadIcon from "@mui/icons-material/Download";

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
}: TagSearchProps & ListProps) {
  // router
  const { projectId } = useParams() as { projectId: string };

  // queries
  // we handle all tags as if it were a list of ids! (even though it returns full tags!)
  const allTags = ProjectHooks.useGetAllTags(parseInt(projectId));

  return (
    <>
      <List {...(props as ListProps)}>
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleAllDocumentsClick()}>
            <ListItemIcon>
              <StorageIcon />
            </ListItemIcon>
            <ListItemText primary="All documents" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton onClick={() => handleNewDocumentsClick()} disabled>
            <ListItemIcon>
              <DownloadIcon />
            </ListItemIcon>
            <ListItemText primary="New documents" />
          </ListItemButton>
        </ListItem>

        <Divider />
        {allTags.isLoading && <div>Loading!</div>}
        {allTags.isError && <div>Error: {allTags.error.message}</div>}
        {allTags.isSuccess && (
          <>
            {allTags.data.map((tag) => (
              <TagListItem key={tag.id} tagId={tag.id} selectedTagId={selectedTag} handleClick={handleTagClick} />
            ))}
          </>
        )}
        <Divider />
        <TagCreationButton tagName={""} />
        <TagManageButton />
      </List>
      <TagEditDialog />
    </>
  );
}

export default TagExplorer;
