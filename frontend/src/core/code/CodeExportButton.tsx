import { ExportButton } from "@components/export-buttons/index";
import { ExportJobType } from "../../api/openapi/models/ExportJobType";

export function CodeExportButton() {
  return (
    <ExportButton
      title="Export all codes"
      export_job_type={ExportJobType.ALL_CODES}
      specific_export_job_parameters={null}
    />
  );
}
