import { ColumnInfo } from "@core/filter";
import { SortDirection } from "@models/SortDirection";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ClearIcon from "@mui/icons-material/Clear";
import SortIcon from "@mui/icons-material/Sort";
import { Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import { ReactNode, useState } from "react";
import { WorkspaceSort } from "../../../types/WorkspaceGeneratedTypes";

interface SortMenuButtonProps<TColumns extends string> {
  columns: TColumns[];
  columnIcons: Record<TColumns, ReactNode>;
  columnInfo?: Record<string, ColumnInfo>;
  activeSort?: WorkspaceSort<TColumns>;
  onChange: (column?: TColumns) => void;
  onToggleDirection: () => void;
}

/** Sort button that owns its menu. */
export function SortMenuButton<TColumns extends string>({
  columns,
  columnIcons,
  columnInfo,
  activeSort,
  onChange,
  onToggleDirection,
}: SortMenuButtonProps<TColumns>) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleChange = (column?: TColumns) => {
    onChange(column);
    setAnchorEl(null);
  };
  const handleToggleDirection = () => {
    onToggleDirection();
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title="Sort">
        <IconButton
          size="small"
          color={activeSort ? "primary" : "default"}
          onClick={(event) => setAnchorEl(event.currentTarget)}
        >
          <SortIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        <MenuItem selected={!activeSort} onClick={() => handleChange()}>
          <ListItemIcon>
            <ClearIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>No sorting</ListItemText>
        </MenuItem>
        <Divider />
        {columns.map((column) => (
          <MenuItem key={column} selected={activeSort?.column === column} onClick={() => handleChange(column)}>
            <ListItemIcon>{columnIcons[column]}</ListItemIcon>
            <ListItemText>{columnInfo?.[column]?.label ?? column}</ListItemText>
          </MenuItem>
        ))}
        {activeSort ? (
          <>
            <Divider />
            <MenuItem onClick={handleToggleDirection}>
              <ListItemIcon>
                {activeSort.direction === SortDirection.ASC ? (
                  <ArrowUpwardIcon fontSize="small" />
                ) : (
                  <ArrowDownwardIcon fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText>{activeSort.direction === SortDirection.ASC ? "Ascending" : "Descending"}</ListItemText>
            </MenuItem>
          </>
        ) : null}
      </Menu>
    </>
  );
}
