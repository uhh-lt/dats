import { ColumnInfo } from "@core/filter";
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import { Checkbox, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from "@mui/material";
import { ReactNode, useState } from "react";

interface PropertiesMenuButtonProps<TColumns extends string> {
  /** All columns, in display order. */
  columns: TColumns[];
  /** Which columns may be selected for rendering. */
  renderableColumns: Record<TColumns, boolean>;
  columnIcons: Record<TColumns, ReactNode>;
  columnInfo?: Record<string, ColumnInfo>;
  /** The currently selected properties. */
  selectedProperties: TColumns[];
  onChange: (selected: TColumns[]) => void;
}

/**
 * "Properties" selector: a checklist of the renderable columns. Toggling one
 * updates the view's `selected_properties`, which drives what the card/list/feed
 * presentation components render.
 */
export function PropertiesMenuButton<TColumns extends string>({
  columns,
  renderableColumns,
  columnIcons,
  columnInfo,
  selectedProperties,
  onChange,
}: PropertiesMenuButtonProps<TColumns>) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const renderable = columns.filter((column) => renderableColumns[column]);
  if (renderable.length === 0) return null;

  const handleToggle = (column: TColumns) => {
    const selected = selectedProperties.includes(column)
      ? selectedProperties.filter((property) => property !== column)
      : [...selectedProperties, column];
    onChange(selected);
  };

  return (
    <>
      <Tooltip title="Properties">
        <IconButton size="small" onClick={(event) => setAnchorEl(event.currentTarget)}>
          <ViewColumnIcon />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
        {renderable.map((column) => (
          <MenuItem key={column} onClick={() => handleToggle(column)}>
            <Checkbox size="small" checked={selectedProperties.includes(column)} sx={{ p: 0.5, mr: 1 }} />
            <ListItemIcon>{columnIcons[column]}</ListItemIcon>
            <ListItemText>{columnInfo?.[column]?.label ?? column}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
