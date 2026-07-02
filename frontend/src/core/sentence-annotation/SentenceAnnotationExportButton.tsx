import { ExportButton } from "@core/export-buttons";
import { ExportJobType } from "@models/ExportJobType";

interface SentenceAnnotationExportButtonProps {
  sentenceAnnotationIds: number[];
}

export function SentenceAnnotationExportButton({ sentenceAnnotationIds }: SentenceAnnotationExportButtonProps) {
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
