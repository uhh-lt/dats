import DeleteIcon from "@mui/icons-material/Delete";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { LoadingButton } from "@mui/lab";
import {
  Box,
  CardContent,
  Divider,
  IconButton,
  LinearProgress,
  LinearProgressProps,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import PreProHooks from "../../../api/PreProHooks";
import ProjectHooks from "../../../api/ProjectHooks";
import SdocHooks from "../../../api/SdocHooks";
import { ContextMenuPosition } from "../../../components/ContextMenu/ContextMenuPosition";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import ProjectDocumentsContextMenu from "./ProjectDocumentsContextMenu";
import { ProjectProps } from "./ProjectProps";

// allowed mime types
const allowedMimeTypes: Array<string> = new Array<string>();
allowedMimeTypes.push("text/plain");
allowedMimeTypes.push("text/html");
allowedMimeTypes.push("image/jpeg");
allowedMimeTypes.push("image/png");
allowedMimeTypes.push("application/zip");
allowedMimeTypes.push("application/pdf");
allowedMimeTypes.push("application/msword");
allowedMimeTypes.push("application/vnd.openxmlformats-officedocument.wordprocessingml.document");

function LinearProgressWithLabel(
  props: Omit<LinearProgressProps, "value"> & { current: number; max: number; indeterminate: boolean }
) {
  return (
    <Tooltip
      title={
        props.current === props.max
          ? `Status: All ${props.max} documents are processed.`
          : `Status: ${props.current} of ${props.max} documents are processed.`
      }
      followCursor
    >
      <Box sx={{ display: "flex", alignItems: "center", px: 3 }}>
        <Box sx={{ width: "100%", mr: 1 }}>
          <LinearProgress
            variant={props.indeterminate ? "indeterminate" : "determinate"}
            style={{ height: 6, borderRadius: 5, ...props.style }}
            value={(props.current / props.max) * 100}
            {...props}
          />
        </Box>
        <Box sx={{ minWidth: 35 }}>
          <Typography variant="body2" color="text.secondary">{`${props.current}/${props.max}`}</Typography>
        </Box>
      </Box>
    </Tooltip>
  );
}

function ProjectDocuments({ project }: ProjectProps) {
  const { ref, inView } = useInView();

  // global server state (react-query)
  const projectDocuments = ProjectHooks.useGetProjectDocumentsInfinite(project.id);
  const uploadProgress = PreProHooks.usePollPreProProjectStatus(project.id).data;

  // automatically fetch new documents when button is visible
  // TODO: switch to virtualization
  useEffect(() => {
    if (inView && projectDocuments.hasNextPage) {
      projectDocuments.fetchNextPage();
    }
  }, [inView, projectDocuments]);

  // file upload
  const [waiting, setWaiting] = useState<boolean>(false);
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
            // FIXME: selbst mit initialen Timeout vor neuem rerender gibt das Backend für in_progress false zurück
            setTimeout(() => setWaiting(false), 5000);
            if (fileInputRef.current) {
              fileInputRef.current.files = null;
              fileInputRef.current.value = "";
            }
            setFiles([]);
            setWaiting(true);
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
    <Box display="flex" className="myFlexContainer h100">
      <Toolbar variant="dense" className="myFlexFitContentContainer">
        <Typography variant="h6" color="inherit" component="div">
          Import documents
        </Typography>
        {process.env.REACT_APP_STABILITY === "UNSTABLE" && (
          <Typography
            variant="body1"
            color="inherit"
            component="div"
            sx={{ ml: 1, fontWeight: "bold", textDecoration: "underline" }}
          >
            (no sensitive data!)
          </Typography>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <input type="file" ref={fileInputRef} onChange={handleChange} multiple accept={allowedMimeTypes.toString()} />
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
      {waiting}
      <LinearProgressWithLabel
        indeterminate={waiting}
        current={uploadProgress?.num_sdocs_finished || 0}
        max={uploadProgress?.num_sdocs_total || 0}
      />

      <Divider />
      {projectDocuments.isLoading && <CardContent>Loading project documents...</CardContent>}
      {projectDocuments.isError && (
        <CardContent>An error occurred while loading project documents for project {project.id}...</CardContent>
      )}
      {projectDocuments.isSuccess && (
        <div className="myFlexFillAllContainer">
          <List style={{ maxHeight: "100%" }}>
            {projectDocuments.data.pages.map((paginatedDocuments, i) => (
              <React.Fragment key={i}>
                {paginatedDocuments.sdocs.map((document) => (
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
              </React.Fragment>
            ))}
            <ListItem disablePadding ref={ref}>
              <ListItemButton
                onClick={() => projectDocuments.fetchNextPage()}
                disabled={!projectDocuments.hasNextPage || projectDocuments.isFetchingNextPage}
              >
                <ListItemText
                  primary={
                    projectDocuments.isFetchingNextPage
                      ? "Loading more..."
                      : projectDocuments.hasNextPage
                      ? "Load More"
                      : "Nothing more to load"
                  }
                />
              </ListItemButton>
            </ListItem>
          </List>
        </div>
      )}
      <ProjectDocumentsContextMenu
        position={contextMenuPosition}
        projectId={project.id}
        sdocId={contextMenuData}
        handleClose={() => setContextMenuPosition(null)}
        onDeleteDocument={handleClickDeleteFile}
      />
    </Box>
  );
}

export default ProjectDocuments;
