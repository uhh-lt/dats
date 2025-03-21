import { memo } from "react";
import { useParams } from "react-router-dom";
import { ExportJobType } from "../../../../api/openapi/models/ExportJobType.ts";
import ExportInstantButton from "../../../../components/Exporter/ExportInstantButton.tsx";

interface ExportAnnotationsButtonProps {
  sentAnnotationIds: number[];
}

function ExportSentAnnotationsButton({ sentAnnotationIds }: ExportAnnotationsButtonProps) {
  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  return (
    <ExportInstantButton
      title={sentAnnotationIds.length === 0 ? "Select annotations to export!" : "Export selected annotations"}
      export_job_type={ExportJobType.SINGLE_PROJECT_SELECTED_SENTENCE_ANNOTATIONS}
      project_id={projectId}
      sentence_annotation_ids={sentAnnotationIds}
      isDisabled={sentAnnotationIds.length === 0}
    />
  );
}

export default memo(ExportSentAnnotationsButton);
