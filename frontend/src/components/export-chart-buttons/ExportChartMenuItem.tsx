import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { Icon, getIconComponent } from "@utils/icons/iconUtils";
import { exportChart } from "./_utils/exportUtils";

interface ExportChartMenuItemProps {
  title: string;
  chartName: string;
  chartIdentifier: string;
}

export function ExportChartMenuItem({
  title,
  chartName,
  chartIdentifier,
  ...props
}: ExportChartMenuItemProps & Omit<MenuItemProps, "onClick">) {
  return (
    <MenuItem onClick={() => exportChart(chartIdentifier, chartName)} {...props}>
      <ListItemIcon>{getIconComponent(Icon.EXPORT)}</ListItemIcon>
      <ListItemText>{title}</ListItemText>
    </MenuItem>
  );
}
