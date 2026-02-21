import { ExportJobType } from "../../api/openapi/models/ExportJobType.ts";
import { ExportButton } from "./ExportButton.tsx";

export function ExportTagsButton() {
  return (
    <ExportButton
      title="Export all tags"
      export_job_type={ExportJobType.ALL_TAGS}
      specific_export_job_parameters={null}
    />
  );
}
