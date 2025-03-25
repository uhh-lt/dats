import { IconButton, Tooltip } from "@mui/material";
import { memo, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import ExporterHooks from "../../api/ExporterHooks.ts";
import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";
import { ExportJobParameters } from "../../api/openapi/models/ExportJobParameters.ts";
import { downloadFile } from "../../utils/ExportUtils.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import { useOpenSnackbar } from "../SnackbarDialog/useOpenSnackbar.ts";

interface ExportInstantButtonProps extends Omit<ExportJobParameters, "project_id"> {
  title: string;
  isDisabled?: boolean;
}

function ExportButton({
  title,
  isDisabled = false,
  export_job_type,
  specific_export_job_parameters,
}: ExportInstantButtonProps) {
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
        export_job_type: export_job_type,
        project_id: projectId,
        specific_export_job_parameters: specific_export_job_parameters,
      },
    });
  }, [startExportMutation, export_job_type, projectId, specific_export_job_parameters]);

  useEffect(() => {
    if (!exportJob.data) return;
    if (exportJob.data.status) {
      if (exportJob.data.status === BackgroundJobStatus.FINISHED) {
        downloadFile("/content/" + exportJob.data.results_url);
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
    <Tooltip title={title}>
      <span>
        <IconButton
          onClick={onClick}
          disabled={isDisabled}
          loading={isPending || exportJob.data?.status === BackgroundJobStatus.WAITING}
        >
          {getIconComponent(Icon.EXPORT)}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default memo(ExportButton);
