import { ExportJobType } from "@api/models/ExportJobType";
import { ExportButton } from "@core/export-buttons";

interface MemosExportButtonProps {
  memoIds: number[];
}

export function MemosExportButton({ memoIds }: MemosExportButtonProps) {
  const exportAll = memoIds.length === 0;
  return (
    <ExportButton
      title={exportAll ? "Export all memos" : "Export selected memos"}
      export_job_type={exportAll ? ExportJobType.ALL_MEMOS : ExportJobType.SELECTED_MEMOS}
      specific_export_job_parameters={
        exportAll ? null : { export_job_type: ExportJobType.SELECTED_MEMOS, memo_ids: memoIds }
      }
    />
  );
}
