import { ExportButton } from "@core/export-buttons";
import { ExportJobType } from "@models/ExportJobType";

export function PromptExportButton() {
  return (
    <ExportButton
      title="Export all prompts"
      export_job_type={ExportJobType.ALL_PROMPTS}
      specific_export_job_parameters={null}
    />
  );
}
