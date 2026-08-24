import { MenuButtonGrid } from "@components/MenuButtonGrid";
import { MenuGridButton } from "@components/MenuGridButton";
import { getIconComponent, SearchViewLayoutIcons } from "@components/icons";
import { MyFilter } from "@core/filter";
import { SearchViewLayout } from "@models/SearchViewLayout";
import AddIcon from "@mui/icons-material/Add";
import { Box, Divider, IconButton, Menu, Tooltip, Typography } from "@mui/material";
import { formatOptionLabel } from "@utils/StringUtils";
import { useState } from "react";
import { EntityWorkspaceConfig, WorkspaceTemplate } from "../../../types/EntityWorkspaceConfig";
import { WorkspaceGroupConfig, WorkspaceSort } from "../../../types/WorkspaceGeneratedTypes";

interface CreateViewMenuButtonProps<TColumns extends string, TRow extends { id: number }> {
  config: EntityWorkspaceConfig<TColumns, TRow>;
  onCreate: (
    name: string,
    layout: SearchViewLayout,
    filters?: MyFilter<TColumns>,
    groupBy?: WorkspaceGroupConfig<TColumns> | null,
    sorts?: WorkspaceSort<TColumns>[],
  ) => void;
}

/** Add-view button that owns its create-view menu. */
export function CreateViewMenuButton<TColumns extends string, TRow extends { id: number }>({
  config,
  onCreate,
}: CreateViewMenuButtonProps<TColumns, TRow>) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleCreate = (...args: Parameters<typeof onCreate>) => {
    const [name, layout, filters, groupBy, sorts] = args;
    // BOARD views require a grouping; default to the config's defaultGroupBy when none is given.
    const resolvedGroupBy = layout === SearchViewLayout.BOARD ? (groupBy ?? config.defaultGroupBy) : groupBy;
    onCreate(name, layout, filters, resolvedGroupBy, sorts);
    setAnchorEl(null);
  };
  const handleTemplate = (template: WorkspaceTemplate<TColumns>) => {
    handleCreate(template.label, template.layout, template.filters, template.groupBy, template.sorts);
  };

  return (
    <>
      <Tooltip title="Add view">
        <IconButton size="small" onClick={(event) => setAnchorEl(event.currentTarget)}>
          <AddIcon />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 500, maxWidth: "calc(100vw - 32px)" } } }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, pt: 0.5, pb: 1 }}>
          Layout
        </Typography>
        <Box sx={{ px: 1 }}>
          <MenuButtonGrid columns={4}>
            {Object.values(SearchViewLayout).map((layout) => (
              <MenuGridButton
                key={layout}
                icon={getIconComponent(SearchViewLayoutIcons[layout], { fontSize: "small" })}
                label={formatOptionLabel(layout)}
                onClick={() => handleCreate(`${formatOptionLabel(layout)} view`, layout)}
              />
            ))}
          </MenuButtonGrid>
        </Box>
        <Divider sx={{ my: 1 }} />
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, pb: 1 }}>
          Templates
        </Typography>
        <Box sx={{ px: 1 }}>
          <MenuButtonGrid columns={4}>
            {config.templates.map((template) => (
              <MenuGridButton
                key={template.label}
                icon={template.icon}
                label={template.label}
                onClick={() => handleTemplate(template)}
              />
            ))}
          </MenuButtonGrid>
        </Box>
      </Menu>
    </>
  );
}
