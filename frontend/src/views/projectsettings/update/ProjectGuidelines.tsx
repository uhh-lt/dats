import React, { ChangeEvent, useRef, useState } from "react";
import {
  Box,
  CardContent,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import DeleteIcon from "@mui/icons-material/Delete";
import ProjectHooks from "../../../api/ProjectHooks";
import SdocHooks from "../../../api/SdocHooks";
import { LoadingButton } from "@mui/lab";
import { ContextMenuPosition } from "../../../components/ContextMenu/ContextMenuPosition";
import { ProjectProps } from "./ProjectProps";
import { SourceDocumentRead } from "../../../api/openapi";
import ProjectGuidelinesContextMenu from "./ProjectGuidelinesContextMenu";

// allowed mime types
const allowedMimeTypes: Array<string> = new Array<string>();
allowedMimeTypes.push("application/pdf");

function ProjectGuidelines({ project }: ProjectProps) {
  // global server state (react-query)
  const projectGuidelines = {
    data: new Array<SourceDocumentRead>(),
    isLoading: false,
    isError: false,
    isSuccess: true,
  }; // TODO

  // file upload
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    } else {
      setFiles([]);
    }
  };

  const uploadGuidelinesMutation = ProjectHooks.useUploadDocument(); // TODO
  const handleClickUploadFile = () => {
    if (files) {
      uploadGuidelinesMutation.mutate(
        {
          projId: project.id,
          formData: {
            doc_files: Array.from(files),
          },
        },
        {
          onSuccess: (data) => {
            SnackbarAPI.openSnackbar({
              text: data,
              severity: "success",
            });
            setFiles([]);
            if (fileInputRef.current) {
              fileInputRef.current.files = null;
              fileInputRef.current.value = "";
            }
          },
        }
      );
    }
  };

  // file deletion
  const deleteGuidelinesMutation = SdocHooks.useDeleteDocument(); // TODO
  const handleClickDeleteFile = (guidelineId: number) => {
    deleteGuidelinesMutation.mutate(
      { sdocId: guidelineId },
      {
        onSuccess: (data) => {
          SnackbarAPI.openSnackbar({
            text: "Successfully deleted file " + data.filename + "!",
            severity: "success",
          });
        },
      }
    );
  };

  // context menu
  const [contextMenuPosition, setContextMenuPosition] = useState<ContextMenuPosition | null>(null);
  const [contextMenuData, setContextMenuData] = useState<number>();
  const onContextMenu = (sdocId: number) => (event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenuPosition({ x: event.clientX, y: event.clientY });
    setContextMenuData(sdocId);
  };

  return (
    <Box display="flex" className="myFlexContainer h100">
      <Toolbar variant="dense" className="myFlexFitContentContainer">
        <Typography variant="h6" color="inherit" component="div">
          Import documents
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <input type="file" ref={fileInputRef} onChange={handleChange} multiple accept={allowedMimeTypes.toString()} />
        <LoadingButton
          variant="contained"
          component="label"
          startIcon={<UploadFileIcon />}
          onClick={handleClickUploadFile}
          disabled={files.length === 0}
          loading={uploadGuidelinesMutation.isLoading}
          loadingPosition="start"
        >
          Upload File{files.length > 1 ? "s" : ""}
        </LoadingButton>
      </Toolbar>
      <Divider />
      {projectGuidelines.isLoading && <CardContent>Loading project guidelines...</CardContent>}
      {projectGuidelines.isError && (
        <CardContent>An error occurred while loading project guidelines for project {project.id}...</CardContent>
      )}
      {projectGuidelines.isSuccess && (
        <div className="myFlexFillAllContainer">
          <List style={{ maxHeight: "100%" }}>
            {projectGuidelines.data.map((guidelines) => (
              <ListItem
                disablePadding
                key={guidelines.id}
                onContextMenu={onContextMenu(guidelines.id)}
                secondaryAction={
                  <Tooltip title={"Delete document"}>
                    <span>
                      <IconButton onClick={() => handleClickDeleteFile(guidelines.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                }
              >
                <ListItemButton>
                  <ListItemText primary={guidelines.filename} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </div>
      )}
      <ProjectGuidelinesContextMenu
        position={contextMenuPosition}
        projectId={project.id}
        guidelinesId={contextMenuData}
        handleClose={() => setContextMenuPosition(null)}
        onDeleteGuidelines={handleClickDeleteFile}
      />
    </Box>
  );
}

export default ProjectGuidelines;
