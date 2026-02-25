import { ExportMenuItem } from "@components/export-buttons/index";
import { ExportJobType } from "../../api/openapi/models/ExportJobType";

export function FolderExportMenuItem() {
  return (
    <ExportMenuItem
      title="Export all folders"
      export_job_type={ExportJobType.ALL_FOLDERS}
      specific_export_job_parameters={null}
    />
  );
}
