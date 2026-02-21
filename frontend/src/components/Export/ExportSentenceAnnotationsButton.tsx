import { ExportJobType } from "../../api/openapi/models/ExportJobType.ts";
import { ExportButton } from "./ExportButton.tsx";

interface ExportSentenceAnnotationsButtonProps {
  sentenceAnnotationIds: number[];
}

export function ExportSentenceAnnotationsButton({ sentenceAnnotationIds }: ExportSentenceAnnotationsButtonProps) {
  const exportAll = sentenceAnnotationIds.length === 0;
  return (
    <ExportButton
      title={exportAll ? "Export all sentence annotations" : "Export selected sentence annotations"}
      export_job_type={exportAll ? ExportJobType.ALL_SENTENCE_ANNOTATIONS : ExportJobType.SELECTED_SENTENCE_ANNOTATIONS}
      specific_export_job_parameters={
        exportAll
          ? null
          : {
              export_job_type: ExportJobType.SELECTED_SENTENCE_ANNOTATIONS,
              sentence_annotation_ids: sentenceAnnotationIds,
            }
      }
    />
  );
}
