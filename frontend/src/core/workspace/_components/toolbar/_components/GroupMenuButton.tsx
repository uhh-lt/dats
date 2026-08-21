import { ColumnInfo } from "@core/filter";
import { DateGranularity } from "@models/DateGranularity";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ClearIcon from "@mui/icons-material/Clear";
import WorkspacesIcon from "@mui/icons-material/Workspaces";
import { Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import { formatOptionLabel } from "@utils/StringUtils";
import { ReactNode, useState } from "react";
import { WorkspaceView } from "../../../types/WorkspaceGeneratedTypes";

interface GroupMenuButtonProps<TColumns extends string> {
  columns: TColumns[];
  columnIcons: Record<TColumns, ReactNode>;
  columnInfo?: Record<string, ColumnInfo>;
  groupBy?: WorkspaceView<TColumns>["group_by"];
  isDateGroup: boolean;
  onChange: (column?: TColumns) => void;
  onGranularityChange: (granularity: DateGranularity) => void;
}

/** Group button that owns its menu. */
export function GroupMenuButton<TColumns extends string>({
  columns,
  columnIcons,
  columnInfo,
  groupBy,
  isDateGroup,
  onChange,
  onGranularityChange,
}: GroupMenuButtonProps<TColumns>) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleChange = (column?: TColumns) => {
    onChange(column);
    setAnchorEl(null);
  };
  const handleGranularityChange = (granularity: DateGranularity) => {
    onGranularityChange(granularity);
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title="Group">
        <IconButton
          size="small"
          color={groupBy ? "primary" : "default"}
          onClick={(event) => setAnchorEl(event.currentTarget)}
        >
          <WorkspacesIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem selected={!groupBy} onClick={() => handleChange()}>
          <ListItemIcon>
            <ClearIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>No grouping</ListItemText>
        </MenuItem>
        <Divider />
        {columns.map((column) => (
          <MenuItem key={column} selected={groupBy?.field === column} onClick={() => handleChange(column)}>
            <ListItemIcon>{columnIcons[column]}</ListItemIcon>
            <ListItemText>{columnInfo?.[column]?.label ?? column}</ListItemText>
          </MenuItem>
        ))}
        {isDateGroup ? (
          <>
            <Divider />
            {Object.values(DateGranularity).map((granularity) => (
              <MenuItem
                key={granularity}
                selected={groupBy?.date_granularity === granularity}
                onClick={() => handleGranularityChange(granularity)}
              >
                <ListItemIcon>
                  <CalendarMonthIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>{formatOptionLabel(granularity)}</ListItemText>
              </MenuItem>
            ))}
          </>
        ) : null}
      </Menu>
    </>
  );
}
