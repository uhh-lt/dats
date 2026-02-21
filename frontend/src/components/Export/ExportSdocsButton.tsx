import { ExportJobType } from "../../api/openapi/models/ExportJobType.ts";
import { ExportButton } from "./ExportButton.tsx";

interface ExportSdocsButtonProps {
  sdocIds: number[];
}

export function ExportSdocsButton({ sdocIds: sdocIds }: ExportSdocsButtonProps) {
  const exportAll = sdocIds.length === 0;
  return (
    <ExportButton
      title={exportAll ? "Export all documents" : "Export selected documents"}
      export_job_type={exportAll ? ExportJobType.ALL_SDOCS : ExportJobType.SELECTED_SDOCS}
      specific_export_job_parameters={
        exportAll
          ? null
          : {
              export_job_type: ExportJobType.SELECTED_SDOCS,
              sdoc_ids: sdocIds,
            }
      }
    />
  );
}
