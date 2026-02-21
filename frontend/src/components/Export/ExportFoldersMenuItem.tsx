import { ExportJobType } from "../../api/openapi/models/ExportJobType.ts";
import { ExportMenuItem } from "./ExportMenuItem.tsx";

export function ExportFoldersMenuItem() {
  return (
    <ExportMenuItem
      title="Export all folders"
      export_job_type={ExportJobType.ALL_FOLDERS}
      specific_export_job_parameters={null}
    />
  );
}
