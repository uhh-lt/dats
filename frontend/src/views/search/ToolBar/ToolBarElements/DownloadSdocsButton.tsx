import DownloadIcon from "@mui/icons-material/Download";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import ExporterHooks from "../../../../api/ExporterHooks.ts";
import { BackgroundJobStatus } from "../../../../api/openapi/models/BackgroundJobStatus.ts";
import { ExportJobType } from "../../../../api/openapi/models/ExportJobType.ts";
import SnackbarAPI from "../../../../features/Snackbar/SnackbarAPI.ts";

interface DownloadSdocsButtonProps {
  sdocIds: number[];
}

export default function DownloadSdocsButton({ sdocIds }: DownloadSdocsButtonProps) {
  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  const startExport = ExporterHooks.useStartExportJob();
  const exportJob = ExporterHooks.useGetExportJob(startExport.data?.id);

  const onClick = () => {
    startExport.mutate({
      requestBody: {
        export_job_type: ExportJobType.SINGLE_PROJECT_SELECTED_SDOCS,
        specific_export_job_parameters: {
          project_id: projectId,
          export_job_type: ExportJobType.SINGLE_PROJECT_SELECTED_SDOCS,
          sdoc_ids: sdocIds,
        },
      },
    });
  };

  useEffect(() => {
    if (!exportJob.data) return;
    if (exportJob.data.status) {
      if (exportJob.data.status === BackgroundJobStatus.FINISHED) {
        window.open(import.meta.env.VITE_APP_CONTENT + "/" + exportJob.data.results_url, "_blank");
        // Make sure the download doesn't start again on a re-render
        startExport.reset();
      } else if (exportJob.data.status === BackgroundJobStatus.ERRORNEOUS) {
        SnackbarAPI.openSnackbar({
          text: `Export job ${exportJob.data.id} failed`,
          severity: "error",
        });
      }
    }
  }, [exportJob.data, startExport]);

  if (startExport.isPending || exportJob.data?.status === BackgroundJobStatus.WAITING) {
    return <CircularProgress size={20} />;
  } else {
    return (
      <Tooltip title="Download selected documents">
        <IconButton onClick={onClick}>
          <DownloadIcon />
        </IconButton>
      </Tooltip>
    );
  }
}
