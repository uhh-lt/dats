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
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import DeleteIcon from "@mui/icons-material/Delete";
import { ProjectRead } from "../../../api/openapi";
import ProjectHooks from "../../../api/ProjectHooks";
import SdocHooks from "../../../api/SdocHooks";
import { QueryKey } from "../../../api/QueryKey";
import { LoadingButton } from "@mui/lab";

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
  const queryClient = useQueryClient();
  const uploadFileMutation = ProjectHooks.useUploadDocument({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_DOCUMENTS, project.id]);
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
  });
  const handleClickUploadFile = () => {
    if (files) {
      uploadFileMutation.mutate({
        projId: project.id,
        formData: {
          doc_files: Array.from(files),
        },
      });
    }
  };

  // file deletion
  const deleteFileMutation = SdocHooks.useDeleteDocument({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_DOCUMENTS, project.id]);
      SnackbarAPI.openSnackbar({
        text: "Successfully deleted file " + data.filename + "!",
        severity: "success",
      });
    },
  });
  const handleClickDeleteFile = (sourceFileId: number) => {
    deleteFileMutation.mutate({ sdocId: sourceFileId });
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
          loading={uploadFileMutation.isLoading}
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
    </React.Fragment>
  );
}

export default ProjectDocuments;
