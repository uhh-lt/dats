import {
  Box,
  CardContent,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import ProjectHooks from "../../../api/ProjectHooks";
import { ProjectProps } from "./ProjectUpdate";
import DeleteIcon from "@mui/icons-material/Delete";
import { ContextMenuPosition } from "../../../components/ContextMenu/ContextMenuPosition";
import ProjectTagsContextMenu from "./ProjectTagsContextMenu";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import TagHooks from "../../../api/TagHooks";
import LabelIcon from "@mui/icons-material/Label";
import TagEditButton from "../../search/Tags/TagEdit/TagEditButton";
import TagEditDialog from "../../search/Tags/TagEdit/TagEditDialog";

function ProjectTags({ project }: ProjectProps) {
  // global server state (react query)
  const projectTags = ProjectHooks.useGetAllTags(project.id);

  const [tagFilter, setTagFilter] = useState<string>("");

  // context menu
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const [contextMenuData, setContextMenuData] = useState<number>();
  const onContextMenu = (userId: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuData(userId);
  };

  const removeTagMutation = TagHooks.useDeleteTag();
  const handleRemoveTag = (tagId: number) => {
    removeTagMutation.mutate(
      {
        tagId: tagId,
      },
      {
        onSuccess: (data) => {
          SnackbarAPI.openSnackbar({
            text: "Successfully removed tag " + data.title + "!",
            severity: "success",
          });
        },
      }
    );
  };

  const projectTagsFiltered = useMemo(() => {
    const trimmedFilter = tagFilter.trim().toLowerCase();
    if (projectTags.data) {
      if (trimmedFilter.length > 0) {
        return projectTags.data.filter((tag) => tag.title.toLowerCase().includes(trimmedFilter));
      } else {
        return projectTags.data;
      }
    } else {
      return [];
    }
  }, [projectTags.data, tagFilter]);

  return (
    <Box display="flex" className="myFlexContainer h100">
      <Toolbar variant="dense" style={{ paddingRight: "8px" }} className="myFlexFitContentContainer">
        <Typography variant="h6" color="inherit" component="div">
          Filter tags
        </Typography>
        <TextField
          sx={{ ml: 1, flex: 1 }}
          placeholder={"type name here..."}
          variant="outlined"
          size="small"
          value={tagFilter}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setTagFilter(event.target.value);
          }}
        />
      </Toolbar>
      <Divider />
      {projectTags.isLoading && <CardContent>Loading project tags...</CardContent>}
      {projectTags.isError && (
        <CardContent>An error occurred while loading project tags for project {project.id}...</CardContent>
      )}
      {projectTags.isSuccess && (
        <List className="myFlexFillAllContainer">
          {projectTagsFiltered.map((tag) => (
            <ListItem
              disablePadding
              key={tag.id}
              onContextMenu={onContextMenu(tag.id)}
              secondaryAction={
                <>
                  <Tooltip title={"Remove tag from project"}>
                    <span>
                      <IconButton onClick={() => handleRemoveTag(tag.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <TagEditButton tagId={tag.id} />
                </>
              }
            >
              <ListItemButton>
                <ListItemIcon sx={{ minWidth: "32px" }}>
                  <LabelIcon style={{ color: tag.color }} />
                </ListItemIcon>
                <ListItemText primary={tag.title} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
      <TagEditDialog />
      <ProjectTagsContextMenu
        position={contextMenuPosition}
        tagId={contextMenuData}
        handleClose={() => setContextMenuPosition(null)}
        onDeleteTag={handleRemoveTag}
      />
    </Box>
  );
}

export default ProjectTags;
