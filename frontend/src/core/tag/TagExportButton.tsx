import { ExportButton } from "@core/export-buttons";
import { ExportJobType } from "@models/ExportJobType";

export function TagExportButton() {
  return (
    <ExportButton
      title="Export all tags"
      export_job_type={ExportJobType.ALL_TAGS}
      specific_export_job_parameters={null}
    />
  );
}
