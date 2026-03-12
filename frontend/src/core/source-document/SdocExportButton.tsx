import { ExportJobType } from "@api/models/ExportJobType";
import { ExportButton } from "@core/export-buttons";

interface SdocExportButtonProps {
  sdocIds: number[];
}

export function SdocExportButton({ sdocIds: sdocIds }: SdocExportButtonProps) {
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
