import { ExportJobType } from "../../api/openapi/models/ExportJobType.ts";
import { ExportButton } from "./ExportButton.tsx";

export function ExportCodesButton() {
  return (
    <ExportButton
      title="Export all codes"
      export_job_type={ExportJobType.ALL_CODES}
      specific_export_job_parameters={null}
    />
  );
}
