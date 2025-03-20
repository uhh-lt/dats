import SaveAltIcon from "@mui/icons-material/SaveAlt";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import ExporterHooks from "../../../../api/ExporterHooks.ts";
import { BackgroundJobStatus } from "../../../../api/openapi/models/BackgroundJobStatus.ts";
import { ExportJobType } from "../../../../api/openapi/models/ExportJobType.ts";
import { useOpenSnackbar } from "../../../../components/SnackbarDialog/useOpenSnackbar.ts";
import { downloadFile } from "../../../../utils/ExportUtils.ts";

interface ExportAnnotationsButtonProps {
  sentAnnotationIds: number[];
}

export default function ExportSentAnnotationsButton({ sentAnnotationIds }: ExportAnnotationsButtonProps) {
  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  const startExport = ExporterHooks.useStartExportJob();
  const exportJob = ExporterHooks.usePollExportJob(startExport.data?.id);

  // snackbar
  const openSnackbar = useOpenSnackbar();

  const handleClick = () => {
    startExport.mutate({
      requestBody: {
        export_job_type: ExportJobType.SINGLE_PROJECT_SELECTED_SENTENCE_ANNOTATIONS,
        specific_export_job_parameters: {
          project_id: projectId,
          export_job_type: ExportJobType.SINGLE_PROJECT_SELECTED_SENTENCE_ANNOTATIONS,
          sentence_annotation_ids: sentAnnotationIds,
        },
      },
    });
  };

  useEffect(() => {
    if (!exportJob.data) return;
    if (exportJob.data.status) {
      if (exportJob.data.status === BackgroundJobStatus.FINISHED) {
        if (exportJob.data.results_url) {
          downloadFile(import.meta.env.VITE_APP_CONTENT + "/" + exportJob.data.results_url);
        }
        // Make sure the download doesn't start again on a re-render
        startExport.reset();
      } else if (exportJob.data.status === BackgroundJobStatus.ERRORNEOUS) {
        openSnackbar({
          text: `Export job ${exportJob.data.id} failed`,
          severity: "error",
        });
      }
    }
  }, [exportJob.data, startExport, openSnackbar]);

  if (startExport.isPending || exportJob.data?.status === BackgroundJobStatus.WAITING) {
    return <CircularProgress size={20} />;
  } else {
    return (
      <Tooltip title={sentAnnotationIds.length === 0 ? "Select annotations to export!" : "Export selected annotations"}>
        <span>
          <IconButton onClick={handleClick} disabled={sentAnnotationIds.length === 0}>
            <SaveAltIcon />
          </IconButton>
        </span>
      </Tooltip>
    );
  }
}
