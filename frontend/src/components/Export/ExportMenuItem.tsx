import { CircularProgress, ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { memo } from "react";
import { ExportJobInput } from "../../api/openapi/models/ExportJobInput.ts";
import { getIconComponent, Icon } from "../../utils/icons/iconUtils.tsx";
import { RUNNING_OR_WAITING, useExport } from "./useExport.ts";

interface ExportMenuItemProps extends Omit<ExportJobInput, "project_id">, Omit<MenuItemProps, "onClick" | "disabled"> {
  title: string;
  isDisabled?: boolean;
}

function ExportMenuItem({
  title,
  isDisabled = false,
  export_job_type,
  specific_export_job_parameters,
  ...props
}: ExportMenuItemProps) {
  const { onClick, isPending, exportJobData } = useExport({
    export_job_type,
    specific_export_job_parameters,
  });

  const isLoading = isPending || (exportJobData && RUNNING_OR_WAITING.includes(exportJobData.status));
  return (
    <MenuItem onClick={onClick} disabled={isDisabled || isLoading} {...props}>
      <ListItemIcon>{isLoading ? <CircularProgress size={24} /> : getIconComponent(Icon.EXPORT)}</ListItemIcon>
      <ListItemText>{title}</ListItemText>
    </MenuItem>
  );
}

export default memo(ExportMenuItem);
