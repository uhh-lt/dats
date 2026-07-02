import { JobHooks } from "@api/hooks/JobHooks";
import { useOpenSnackbar } from "@core/notification";
import { ExportJobInput } from "@models/ExportJobInput";
import { JobStatus } from "@models/JobStatus";
import { useAppSelector } from "@store/storeHooks";
import { downloadFile } from "@utils/downloadUtils";
import { useCallback, useEffect } from "react";

export const RUNNING_OR_WAITING = [JobStatus.QUEUED, JobStatus.DEFERRED, JobStatus.SCHEDULED, JobStatus.STARTED];

export const useExport = ({ export_job_type, specific_export_job_parameters }: Omit<ExportJobInput, "project_id">) => {
  const projectId = useAppSelector((state) => state.project.projectId);

  // mutations
  const { mutate: startExportMutation, reset: resetExport, data, isPending } = JobHooks.useStartExportJob();
  const exportJob = JobHooks.usePollExportJob(data?.job_id);

  // snackbar
  const openSnackbar = useOpenSnackbar();

  const onClick = useCallback(() => {
    if (!projectId) return;
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
      if (exportJob.data.status === JobStatus.FINISHED && exportJob.data.output?.results_url) {
        downloadFile(encodeURI("/content/" + exportJob.data.output.results_url)).catch((error) => {
          console.error("Download failed:", error);
          openSnackbar({
            text: `Failed to download file ${error}.`,
            severity: "error",
          });
        });

        // Make sure the download doesn't start again on a re-render
        resetExport();
      } else if (exportJob.data.status === JobStatus.FAILED) {
        openSnackbar({
          text: `Export job ${exportJob.data.job_id} failed`,
          severity: "error",
        });
      }
    }
  }, [exportJob.data, resetExport, openSnackbar]);

  return {
    onClick,
    isPending,
    exportJobData: exportJob.data,
  };
};
