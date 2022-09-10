import { ListItem, ListItemButton, ListItemIcon, ListItemProps, ListItemText } from "@mui/material";
import TagEditButton from "../TagEdit/TagEditButton";
import MemoButton from "../../../../features/memo-dialog/MemoButton";
import LabelIcon from "@mui/icons-material/Label";
import React from "react";
import TagHooks from "../../../../api/TagHooks";
import { AttachedObjectType } from "../../../../api/openapi";

interface TagListItemProps {
  tagId: number;
  selectedTagId: number | undefined;
  handleClick: (tagId: number) => void;
}

function TagListItem({ tagId, selectedTagId, handleClick, ...props }: TagListItemProps & ListItemProps) {
  const tag = TagHooks.useGetTag(tagId);

  return (
    <>
      {tag.isLoading && <div>Loading!</div>}
      {tag.isError && <div>Error: {tag.error.message}</div>}
      {tag.isSuccess && (
        <ListItem
          secondaryAction={
            <div className="myShowMoreMenu">
              <TagEditButton tagId={tag.data.id} />
              <MemoButton
                edge="end"
                attachedObjectId={tag.data.id}
                attachedObjectType={AttachedObjectType.DOCUMENT_TAG}
              />
            </div>
          }
          disablePadding
          className="myShowMoreListItem"
          {...props}
        >
          <ListItemButton selected={selectedTagId === tag.data.id} onClick={() => handleClick(tag.data.id)}>
            <ListItemIcon style={{ color: tag.data.color }}>
              <LabelIcon />
            </ListItemIcon>
            <ListItemText primary={tag.data.title} />
          </ListItemButton>
        </ListItem>
      )}
    </>
  );
}

export default TagListItem;
