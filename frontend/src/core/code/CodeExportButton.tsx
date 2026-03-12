import { ExportJobType } from "@api/models/ExportJobType";
import { ExportButton } from "@core/export-buttons";

export function CodeExportButton() {
  return (
    <ExportButton
      title="Export all codes"
      export_job_type={ExportJobType.ALL_CODES}
      specific_export_job_parameters={null}
    />
  );
}
