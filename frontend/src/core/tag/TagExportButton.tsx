import { ExportJobType } from "@api/models/ExportJobType";
import { ExportButton } from "@components/export-buttons";

export function TagExportButton() {
  return (
    <ExportButton
      title="Export all tags"
      export_job_type={ExportJobType.ALL_TAGS}
      specific_export_job_parameters={null}
    />
  );
}
