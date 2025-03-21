import { memo } from "react";
import { useParams } from "react-router-dom";
import { ExportJobType } from "../../api/openapi/models/ExportJobType.ts";
import ExportInstantButton from "../Exporter/ExportInstantButton.tsx";

interface DownloadSdocsButtonProps {
  sdocIds: number[];
}

function ExportSdocsButton({ sdocIds }: DownloadSdocsButtonProps) {
  // global client state (react-router)
  const projectId = parseInt((useParams() as { projectId: string }).projectId);

  return (
    <ExportInstantButton
      title={sdocIds.length === 0 ? "Select documents to export!" : "Export selected documents"}
      export_job_type={ExportJobType.SINGLE_PROJECT_SELECTED_SDOCS}
      project_id={projectId}
      sdoc_ids={sdocIds}
      isDisabled={sdocIds.length === 0}
    />
  );
}

export default memo(ExportSdocsButton);
