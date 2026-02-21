import { ExportJobType } from "../../api/openapi/models/ExportJobType.ts";
import { ExportButton } from "./ExportButton.tsx";
import { ExportAnalysisButtonProps } from "./ExportTimelineAnalysisButton.tsx";

export function ExportWhiteboardsButton({ analysisIds }: ExportAnalysisButtonProps) {
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
