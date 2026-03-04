import { ExportJobType } from "@api/models/ExportJobType";
import { ExportAnalysisButtonProps } from "@components/analysis-dashboard";
import { ExportButton } from "@components/export-buttons";

export function TimelineAnalysisExportButton({ analysisIds }: ExportAnalysisButtonProps) {
  const exportAll = analysisIds.length === 0;
  return (
    <ExportButton
      title={exportAll ? "Export all timeline analyses" : "Export selected timeline analyses"}
      export_job_type={exportAll ? ExportJobType.ALL_TIMELINE_ANALYSES : ExportJobType.SELECTED_TIMELINE_ANALYSES}
      specific_export_job_parameters={
        exportAll
          ? null
          : {
              export_job_type: ExportJobType.SELECTED_TIMELINE_ANALYSES,
              timeline_analysis_ids: analysisIds,
            }
      }
    />
  );
}
