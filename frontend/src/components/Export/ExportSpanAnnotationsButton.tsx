import { ExportJobType } from "../../api/openapi/models/ExportJobType.ts";
import { ExportButton } from "./ExportButton.tsx";

interface ExportAnnotationsButtonProps {
  spanAnnotationIds: number[];
}

export function ExportSpanAnnotationsButton({ spanAnnotationIds }: ExportAnnotationsButtonProps) {
  const exportAll = spanAnnotationIds.length === 0;
  return (
    <ExportButton
      title={exportAll ? "Export all span annotations" : "Export selected span annotations"}
      export_job_type={exportAll ? ExportJobType.ALL_SPAN_ANNOTATIONS : ExportJobType.SELECTED_SPAN_ANNOTATIONS}
      specific_export_job_parameters={
        exportAll
          ? null
          : { export_job_type: ExportJobType.SELECTED_SPAN_ANNOTATIONS, span_annotation_ids: spanAnnotationIds }
      }
    />
  );
}
