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
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import DeleteIcon from "@mui/icons-material/Delete";
import { ProjectRead } from "../../../api/openapi";
import ProjectHooks from "../../../api/ProjectHooks";
import SdocHooks from "../../../api/SdocHooks";
import { LoadingButton } from "@mui/lab";
import { ContextMenuPosition } from "../../projects/ProjectContextMenu2";
import ProjectDocumentsContextMenu from "./ProjectDocumentsContextMenu";

interface ProjectDocumentsProps {
  project: ProjectRead;
}

function ProjectDocuments({ project }: ProjectDocumentsProps) {
  // query all documents that belong to the project
  const projectDocuments = ProjectHooks.useGetProjectDocuments(project.id);

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
  const uploadDocumentMutation = ProjectHooks.useUploadDocument();
  const handleClickUploadFile = () => {
    if (files) {
      uploadDocumentMutation.mutate(
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
  const deleteDocumentMutation = SdocHooks.useDeleteDocument();
  const handleClickDeleteFile = (sdocId: number) => {
    deleteDocumentMutation.mutate(
      { sdocId },
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
    <React.Fragment>
      <Toolbar variant="dense">
        <Typography variant="h6" color="inherit" component="div">
          Import documents
        </Typography>
        <Box sx={{ flexGrow: 1 }} />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleChange}
          multiple
          accept="text/plain,image/jpeg,image/png,application/zip"
        />
        <LoadingButton
          variant="contained"
          component="label"
          startIcon={<UploadFileIcon />}
          onClick={handleClickUploadFile}
          disabled={files.length === 0}
          loading={uploadDocumentMutation.isLoading}
          loadingPosition="start"
        >
          Upload File{files.length > 1 ? "s" : ""}
        </LoadingButton>
      </Toolbar>
      <Divider />
      {projectDocuments.isLoading && <CardContent>Loading project documents...</CardContent>}
      {projectDocuments.isError && (
        <CardContent>An error occurred while loading project documents for project {project.id}...</CardContent>
      )}
      {projectDocuments.isSuccess && (
        <List>
          {projectDocuments.data.map((document) => (
            <ListItem
              disablePadding
              key={document.id}
              onContextMenu={onContextMenu(document.id)}
              secondaryAction={
                <Tooltip title={"Delete document"}>
                  <span>
                    <IconButton onClick={() => handleClickDeleteFile(document.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              }
            >
              <ListItemButton>
                <ListItemText primary={document.filename} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
      <ProjectDocumentsContextMenu
        position={contextMenuPosition}
        projectId={project.id}
        sdocId={contextMenuData}
        handleClose={() => setContextMenuPosition(null)}
        onDeleteDocument={handleClickDeleteFile}
      />
    </React.Fragment>
  );
}

export default ProjectDocuments;
