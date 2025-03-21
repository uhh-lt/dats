import { IconButton, Tooltip } from "@mui/material";
import { memo, useCallback, useEffect } from "react";
import ExporterHooks from "../../api/ExporterHooks.ts";
import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";
import { ExportJobParameters } from "../../api/openapi/models/ExportJobParameters.ts";
import { ExportJobType } from "../../api/openapi/models/ExportJobType.ts";
import { downloadFile } from "../../utils/ExportUtils.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import { useOpenSnackbar } from "../SnackbarDialog/useOpenSnackbar.ts";

type SpecificExportJobParameters = Pick<ExportJobParameters, "specific_export_job_parameters">;

function ExportInstantButton({
  title,
  isDisabled,
  ...params
}: SpecificExportJobParameters["specific_export_job_parameters"] & { title: string; isDisabled: boolean }) {
  // mutations
  const { mutate: startExportMutation, reset: resetExport, data, isPending } = ExporterHooks.useStartExportJob();
  const exportJob = ExporterHooks.usePollExportJob(data?.id);

  // snackbar
  const openSnackbar = useOpenSnackbar();

  const onClick = useCallback(() => {
    startExportMutation({
      requestBody: {
        export_job_type: params.export_job_type as ExportJobType,
        specific_export_job_parameters: params,
      },
    });
  }, [startExportMutation, params]);

  useEffect(() => {
    if (!exportJob.data) return;
    if (exportJob.data.status) {
      if (exportJob.data.status === BackgroundJobStatus.FINISHED) {
        downloadFile(import.meta.env.VITE_APP_CONTENT + "/" + exportJob.data.results_url);
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

export default memo(ExportInstantButton);
