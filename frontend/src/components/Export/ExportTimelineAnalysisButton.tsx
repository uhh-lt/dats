import { ExportJobType } from "../../api/openapi/models/ExportJobType.ts";
import { ExportButton } from "./ExportButton.tsx";

export interface ExportAnalysisButtonProps {
  analysisIds: number[];
}

export function ExportTimelineAnalysisButton({ analysisIds }: ExportAnalysisButtonProps) {
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
