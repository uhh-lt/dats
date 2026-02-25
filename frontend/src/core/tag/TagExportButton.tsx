import { ExportButton } from "@components/export-buttons/index";
import { ExportJobType } from "../../api/openapi/models/ExportJobType";

export function TagExportButton() {
  return (
    <ExportButton
      title="Export all tags"
      export_job_type={ExportJobType.ALL_TAGS}
      specific_export_job_parameters={null}
    />
  );
}
