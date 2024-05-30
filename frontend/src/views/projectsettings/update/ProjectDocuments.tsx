import InfoIcon from "@mui/icons-material/Info";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { LoadingButton } from "@mui/lab";
import { Box, Button, Divider, Stack, Toolbar, Tooltip, Typography } from "@mui/material";
import { MRT_RowSelectionState, MRT_SortingState } from "material-react-table";
import { ChangeEvent, useRef, useState } from "react";
import PreProHooks from "../../../api/PreProHooks.ts";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import LinearProgressWithLabel from "../../../components/LinearProgressWithLabel.tsx";
import DeleteSdocsButton from "../../../components/SourceDocument/DeleteSdocsButton.tsx";
import DownloadSdocsButton from "../../../components/SourceDocument/DownloadSdocsButton.tsx";
import SdocTable from "../../../components/SourceDocument/SdocTable/SdocTable.tsx";
import CrawlerRunDialog, { CrawlerRunDialogHandle } from "./CrawlerRunDialog.tsx";
import { ProjectProps } from "./ProjectProps.ts";

const filterName = "projectDocumentsTable";

// allowed mime types
const allowedMimeTypes: Array<string> = new Array<string>();
allowedMimeTypes.push("text/plain");
allowedMimeTypes.push("text/html");
allowedMimeTypes.push("image/jpeg");
allowedMimeTypes.push("image/png");
allowedMimeTypes.push("audio/mpeg");
allowedMimeTypes.push("audio/ogg");
allowedMimeTypes.push("audio/wave");
allowedMimeTypes.push("audio/webm");
allowedMimeTypes.push("audio/x-wav");
allowedMimeTypes.push("audio/x-pn-wav");
allowedMimeTypes.push("audio/wav");
allowedMimeTypes.push("video/mp4");
allowedMimeTypes.push("video/webm");
allowedMimeTypes.push("video/x-m4v");
allowedMimeTypes.push("video/x-msvideo");
allowedMimeTypes.push("video/quicktime");
allowedMimeTypes.push("application/zip");
allowedMimeTypes.push("application/pdf");
allowedMimeTypes.push("application/msword");
allowedMimeTypes.push("application/vnd.openxmlformats-officedocument.wordprocessingml.document");

function ProjectDocuments({ project }: ProjectProps) {
  // global server state (react-query)
  const uploadProgress = PreProHooks.usePollPreProProjectStatus(project.id);

  // table state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});
  const [sortingModel, setSortingModel] = useState<MRT_SortingState>([]);
  const selectedSdocIds = Object.keys(rowSelectionModel).map((id) => parseInt(id));

  // crawler / url import
  const crawlDialogRef = useRef<CrawlerRunDialogHandle>(null);

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
            uploaded_files: Array.from(files),
          },
        },
        {
          onSuccess: () => {
            // FIXME: selbst mit initialen Timeout vor neuem rerender gibt das Backend für in_progress false zurück
            setTimeout(() => {
              setWaiting(false);
              uploadProgress.refetch();
            }, 5000);
            if (fileInputRef.current) {
              fileInputRef.current.files = null;
              fileInputRef.current.value = "";
            }
            setFiles([]);
            setWaiting(true);
          },
        },
      );
    }
  };

  return (
    <Box display="flex" className="myFlexContainer h100">
      <Toolbar variant="dense" className="myFlexFitContentContainer">
        <Typography variant="h6" color="inherit" component="div">
          Import data{" "}
        </Typography>
        <Tooltip
          title={
            "You can upload (multiple) text, image, video and audio documents. The maximum allowed file size is 100MB."
          }
        >
          <InfoIcon sx={{ ml: 0.5 }} fontSize="small" />
        </Tooltip>
        {import.meta.env.VITE_APP_STABILITY === "UNSTABLE" && (
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
          loading={uploadDocumentMutation.isPending}
          loadingPosition="start"
        >
          Upload File{files.length > 1 ? "s" : ""}
        </LoadingButton>
        <Button
          sx={{ ml: 1 }}
          variant="contained"
          component="label"
          startIcon={<UploadFileIcon />}
          onClick={() => crawlDialogRef.current!.open()}
        >
          Import URLs
        </Button>
      </Toolbar>
      {waiting}
      <LinearProgressWithLabel
        variant={waiting ? "indeterminate" : "determinate"}
        current={uploadProgress.data?.num_sdocs_finished || 0}
        max={uploadProgress.data?.num_sdocs_total || 0}
        tooltip={
          uploadProgress.data?.num_sdocs_finished === uploadProgress.data?.num_sdocs_total
            ? `Status: All ${uploadProgress.data?.num_sdocs_total} documents are processed.`
            : `Status: ${uploadProgress.data?.num_sdocs_finished} of ${uploadProgress.data?.num_sdocs_total} documents are processed.`
        }
      />
      <Divider />
      <SdocTable
        projectId={project.id}
        filterName={filterName}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionChange={setRowSelectionModel}
        sortingModel={sortingModel}
        onSortingChange={setSortingModel}
        positionToolbarAlertBanner="head-overlay"
        renderTopToolbarCustomActions={() => (
          <Stack direction={"row"} spacing={1} alignItems="center" height={48}>
            {selectedSdocIds.length > 0 && (
              <>
                <DeleteSdocsButton sdocIds={selectedSdocIds} navigateTo="../search" />
                <DownloadSdocsButton sdocIds={selectedSdocIds} />
              </>
            )}
          </Stack>
        )}
      />
      <CrawlerRunDialog projectId={project.id} ref={crawlDialogRef} />
    </Box>
  );
}

export default ProjectDocuments;
