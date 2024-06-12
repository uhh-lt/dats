import SettingsIcon from "@mui/icons-material/Settings";
import { Box, FormControlLabel, IconButton, Popover, Switch, Tooltip } from "@mui/material";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { LogbookActions } from "../logbookSlice.ts";

function SearchMemoOptionsMenu() {
  // local state
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  // global client state (redux)
  const isQueryContent = useAppSelector((state) => state.logbook.isSearchContent);
  const dispatch = useAppDispatch();

  return (
    <>
      <Tooltip title="Search options">
        <IconButton onClick={(event) => setAnchorEl(anchorEl ? null : event.currentTarget)}>
          <SettingsIcon />
        </IconButton>
      </Tooltip>
      <Popover
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        PaperProps={{
          sx: {
            p: 2,
          },
        }}
      >
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={isQueryContent}
                onChange={(event) => dispatch(LogbookActions.onChangeIsSearchContent(event.target.checked))}
              />
            }
            label="Search title / content"
            sx={{ ml: "-9px" }}
          />
        </Box>
      </Popover>
    </>
  );
}

export default SearchMemoOptionsMenu;
