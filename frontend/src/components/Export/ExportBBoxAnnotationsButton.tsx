import { ExportJobType } from "../../api/openapi/models/ExportJobType.ts";
import { ExportButton } from "./ExportButton.tsx";

interface ExportBBoxAnnotationsButtonProps {
  bboxAnnotationIds: number[];
}

export function ExportBBoxAnnotationsButton({ bboxAnnotationIds: bboxAnnotationIds }: ExportBBoxAnnotationsButtonProps) {
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
