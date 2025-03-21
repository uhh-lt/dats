import { useParams } from "react-router-dom";
import { ExportJobType } from "../../../../api/openapi/models/ExportJobType.ts";
import ExportInstantButton from "../../../../components/Exporter/ExportInstantButton.tsx";

interface ExportAnnotationsButtonProps {
  spanAnnotationIds: number[];
}

export default function ExportSpanAnnotationsButton({ spanAnnotationIds }: ExportAnnotationsButtonProps) {
  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  return (
    <ExportInstantButton
      title={spanAnnotationIds.length === 0 ? "Select annotations to export!" : "Export selected annotations"}
      export_job_type={ExportJobType.SINGLE_PROJECT_SELECTED_SPAN_ANNOTATIONS}
      project_id={projectId}
      sentence_annotation_ids={spanAnnotationIds}
      isDisabled={spanAnnotationIds.length === 0}
    />
  );
}
