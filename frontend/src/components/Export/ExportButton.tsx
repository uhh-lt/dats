import { IconButton, Tooltip } from "@mui/material";
import { memo } from "react";
import { ExportJobInput } from "../../api/openapi/models/ExportJobInput.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import { RUNNING_OR_WAITING, useExport } from "./useExport.ts";

interface ExportInstantButtonProps extends Omit<ExportJobInput, "project_id"> {
  title: string;
  isDisabled?: boolean;
}

function ExportButton({
  title,
  isDisabled = false,
  export_job_type,
  specific_export_job_parameters,
}: ExportInstantButtonProps) {
  const { onClick, isPending, exportJobData } = useExport({
    export_job_type,
    specific_export_job_parameters,
  });

  return (
    <Tooltip title={title}>
      <span>
        <IconButton
          onClick={onClick}
          disabled={isDisabled}
          loading={isPending || (exportJobData && RUNNING_OR_WAITING.includes(exportJobData.status))}
        >
          {getIconComponent(Icon.EXPORT)}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default memo(ExportButton);
