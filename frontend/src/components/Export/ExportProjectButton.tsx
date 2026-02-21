import { ExportJobType } from "../../api/openapi/models/ExportJobType.ts";
import { ExportButton } from "./ExportButton.tsx";

export function ExportProjectButton() {
  return (
    <ExportButton
      title="Export everything! Warning: this may take a long time!"
      export_job_type={ExportJobType.ALL_DATA}
      specific_export_job_parameters={null}
    />
  );
}
