import { Box, FormControlLabel, IconButton, Popover, Switch, Tooltip } from "@mui/material";
import { memo, useCallback, useState } from "react";
import { Icon, getIconComponent } from "../../../../utils/icons/iconUtils.tsx";

interface SearchMemoOptionsMenuProps {
  isSearchContent: boolean;
  onChangeIsSearchContent: (isSearchContent: boolean) => void;
}

export const MemoTableOptionsMenu = memo(
  ({ isSearchContent, onChangeIsSearchContent }: SearchMemoOptionsMenuProps) => {
    // local state
    const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
    const open = Boolean(anchorEl);

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget);
      },
      [anchorEl],
    );

    const handleClose = useCallback(() => {
      setAnchorEl(null);
    }, []);

    const handleSwitchChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        onChangeIsSearchContent(event.target.checked);
      },
      [onChangeIsSearchContent],
    );

    return (
      <>
        <Tooltip title="Search options">
          <IconButton onClick={handleClick}>{getIconComponent(Icon.SETTINGS)}</IconButton>
        </Tooltip>
        <Popover
          open={open}
          onClose={handleClose}
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
          slotProps={{
            paper: {
              sx: {
                p: 2,
              },
            },
          }}
        >
          <Box>
            <FormControlLabel
              control={<Switch checked={isSearchContent} onChange={handleSwitchChange} />}
              label="Search title / content"
              sx={{ ml: "-9px" }}
            />
          </Box>
        </Popover>
      </>
    );
  }
);
