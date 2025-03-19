import DownloadIcon from "@mui/icons-material/Download";
import { IconButton, Tooltip } from "@mui/material";
import { memo, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import ExporterHooks from "../../api/ExporterHooks.ts";
import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";
import { ExportJobType } from "../../api/openapi/models/ExportJobType.ts";
import { useOpenSnackbar } from "../SnackbarDialog/useOpenSnackbar.ts";

interface DownloadSdocsButtonProps {
  sdocIds: number[];
}

function ExportSdocsButton({ sdocIds }: DownloadSdocsButtonProps) {
  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  // mutations
  const { mutate: startExportMutation, reset: resetExport, data, isPending } = ExporterHooks.useStartExportJob();
  const exportJob = ExporterHooks.usePollExportJob(data?.id);

  // snackbar
  const openSnackbar = useOpenSnackbar();

  const onClick = useCallback(() => {
    startExportMutation({
      requestBody: {
        export_job_type: ExportJobType.SINGLE_PROJECT_SELECTED_SDOCS,
        specific_export_job_parameters: {
          project_id: projectId,
          export_job_type: ExportJobType.SINGLE_PROJECT_SELECTED_SDOCS,
          sdoc_ids: sdocIds,
        },
      },
    });
  }, [startExportMutation, projectId, sdocIds]);

  useEffect(() => {
    if (!exportJob.data) return;
    if (exportJob.data.status) {
      if (exportJob.data.status === BackgroundJobStatus.FINISHED) {
        window.open(import.meta.env.VITE_APP_CONTENT + "/" + exportJob.data.results_url, "_blank");
        // Make sure the download doesn't start again on a re-render
        resetExport();
      } else if (exportJob.data.status === BackgroundJobStatus.ERRORNEOUS) {
        openSnackbar({
          text: `Export job ${exportJob.data.id} failed`,
          severity: "error",
        });
      }
    }
  }, [exportJob.data, resetExport, openSnackbar]);

  return (
    <Tooltip title="Download selected documents">
      <IconButton onClick={onClick} loading={isPending || exportJob.data?.status === BackgroundJobStatus.WAITING}>
        <DownloadIcon />
      </IconButton>
    </Tooltip>
  );
}

export default memo(ExportSdocsButton);
