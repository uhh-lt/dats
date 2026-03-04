import { ExportJobType } from "@api/models/ExportJobType";
import { ExportAnalysisButtonProps } from "@components/analysis-dashboard";
import { ExportButton } from "@components/export-buttons";

export function CotaExportButton({ analysisIds }: ExportAnalysisButtonProps) {
  const exportAll = analysisIds.length === 0;
  return (
    <ExportButton
      title={exportAll ? "Export all Concept Over Time Analyses" : "Export selected Concept Over Time Analyses"}
      export_job_type={exportAll ? ExportJobType.ALL_COTA : ExportJobType.SELECTED_COTA}
      specific_export_job_parameters={
        exportAll
          ? null
          : {
              export_job_type: ExportJobType.SELECTED_COTA,
              cota_ids: analysisIds,
            }
      }
    />
  );
}
