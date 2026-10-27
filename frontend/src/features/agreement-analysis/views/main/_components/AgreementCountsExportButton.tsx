import { getIconComponent, Icon } from "@components/icons";
import { AgreementHooks } from "../../../api/agreementHooks";
import { AgreementParams } from "@models/AgreementParams";
import { CircularProgress, IconButton, Tooltip } from "@mui/material";
import { useAppSelector } from "@store/storeHooks";
import { downloadFile } from "@utils/downloadUtils";

interface AgreementCountsExportButtonProps {
  params: AgreementParams | undefined;
}

/** Exports the raw counts (TP, FP, FN) per document and code as CSV. */
export function AgreementCountsExportButton({ params }: AgreementCountsExportButtonProps) {
  const projectId = useAppSelector((state) => state.project.projectId);
  const exportCounts = AgreementHooks.useExportAgreementCounts();

  const handleClick = () => {
    if (!projectId || !params) return;
    exportCounts.mutate(
      { projectId, requestBody: params },
      { onSuccess: (url) => downloadFile(encodeURI("/content/" + url)) },
    );
  };

  if (exportCounts.isPending) {
    return <CircularProgress size={20} />;
  }
  return (
    <Tooltip title="Export raw counts (CSV)">
      <span>
        <IconButton aria-label="Export raw counts (CSV)" onClick={handleClick} disabled={!params}>
          {getIconComponent(Icon.EXPORT)}
        </IconButton>
      </span>
    </Tooltip>
  );
}
