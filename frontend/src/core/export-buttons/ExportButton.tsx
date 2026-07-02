import { getIconComponent, Icon } from "@components/icons";
import { ExportJobInput } from "@models/ExportJobInput";
import { IconButton, Tooltip } from "@mui/material";
import { memo } from "react";
import { RUNNING_OR_WAITING, useExport } from "./_hooks/useExport";

interface ExportInstantButtonProps extends Omit<ExportJobInput, "project_id"> {
  title: string;
  isDisabled?: boolean;
}

export const ExportButton = memo(
  ({ title, isDisabled = false, export_job_type, specific_export_job_parameters }: ExportInstantButtonProps) => {
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
  },
);
