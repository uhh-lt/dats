import { getIconComponent, SearchViewLayoutIcons } from "@components/icons";
import { MenuButtonGrid } from "@components/MenuButtonGrid";
import { MenuGridButton } from "@components/MenuGridButton";
import { SearchViewLayout } from "@models/SearchViewLayout";
import { Box, IconButton, Menu, Tooltip, Typography } from "@mui/material";
import { formatOptionLabel } from "@utils/StringUtils";
import { useState } from "react";

interface LayoutMenuButtonProps {
  layout?: SearchViewLayout;
  onChange: (layout: SearchViewLayout) => void;
}

/** Layout picker button that owns its menu. */
export function LayoutMenuButton({ layout, onChange }: LayoutMenuButtonProps) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handleSelect = (selectedLayout: SearchViewLayout) => {
    onChange(selectedLayout);
    setAnchorEl(null);
  };

  return (
    <>
      <Tooltip title={layout ? `Layout: ${formatOptionLabel(layout)}` : "Layout"}>
        <IconButton size="small" color="primary" onClick={(event) => setAnchorEl(event.currentTarget)}>
          {layout ? getIconComponent(SearchViewLayoutIcons[layout], { fontSize: "small" }) : null}
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        slotProps={{ paper: { sx: { width: 280 } } }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", px: 2, pt: 0.5, pb: 1 }}>
          Change layout
        </Typography>
        <Box sx={{ px: 1 }}>
          <MenuButtonGrid columns={3}>
            {Object.values(SearchViewLayout).map((layoutOption) => (
              <MenuGridButton
                key={layoutOption}
                icon={getIconComponent(SearchViewLayoutIcons[layoutOption], { fontSize: "small" })}
                label={formatOptionLabel(layoutOption)}
                selected={layout === layoutOption}
                onClick={() => handleSelect(layoutOption)}
              />
            ))}
          </MenuButtonGrid>
        </Box>
      </Menu>
    </>
  );
}
