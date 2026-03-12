import { ExportJobType } from "@api/models/ExportJobType";
import { ExportAnalysisButtonProps } from "@components/analysis-dashboard";
import { ExportButton } from "@core/export-buttons";

export function WhiteboardsExportButton({ analysisIds }: ExportAnalysisButtonProps) {
  const exportAll = analysisIds.length === 0;
  return (
    <ExportButton
      title={exportAll ? "Export all whiteboards analyses" : "Export selected whiteboards"}
      export_job_type={exportAll ? ExportJobType.ALL_WHITEBOARDS : ExportJobType.SELECTED_WHITEBOARDS}
      specific_export_job_parameters={
        exportAll
          ? null
          : {
              export_job_type: ExportJobType.SELECTED_WHITEBOARDS,
              whiteboard_ids: analysisIds,
            }
      }
    />
  );
}
