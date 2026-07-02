import { ExportButton } from "@core/export-buttons";
import { ExportJobType } from "@models/ExportJobType";

interface SpanAnnotationExportButtonProps {
  spanAnnotationIds: number[];
}

export function SpanAnnotationExportButton({ spanAnnotationIds }: SpanAnnotationExportButtonProps) {
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
