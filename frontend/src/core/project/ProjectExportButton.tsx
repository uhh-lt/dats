import { ExportButton } from "@core/export-buttons";
import { ExportJobType } from "@models/ExportJobType";

export function ProjectExportButton() {
  return (
    <ExportButton
      title="Export everything! Warning: this may take a long time!"
      export_job_type={ExportJobType.ALL_DATA}
      specific_export_job_parameters={null}
    />
  );
}
