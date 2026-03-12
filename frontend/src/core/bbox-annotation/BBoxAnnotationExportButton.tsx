import { ExportJobType } from "@api/models/ExportJobType";
import { ExportButton } from "@core/export-buttons";

interface ExportBBoxAnnotationsButtonProps {
  bboxAnnotationIds: number[];
}

export function BBoxAnnotationExportButton({ bboxAnnotationIds: bboxAnnotationIds }: ExportBBoxAnnotationsButtonProps) {
  const exportAll = bboxAnnotationIds.length === 0;
  return (
    <ExportButton
      title={exportAll ? "Export all bbox annotations" : "Export selected bbox annotations"}
      export_job_type={exportAll ? ExportJobType.ALL_BBOX_ANNOTATIONS : ExportJobType.SELECTED_BBOX_ANNOTATIONS}
      specific_export_job_parameters={
        exportAll
          ? null
          : { export_job_type: ExportJobType.SELECTED_BBOX_ANNOTATIONS, bbox_annotation_ids: bboxAnnotationIds }
      }
    />
  );
}
