import { FILTER_EXPERT_MODE_PARAM } from "@core/filter";
import HelpIcon from "@mui/icons-material/Help";
import { Box, Button, FormControlLabel, IconButton, Popover, Switch, Tooltip } from "@mui/material";
import { Icon, getIconComponent } from "@utils/icons/iconUtils";
import { useState } from "react";
import { DocumentSearchRouteAPI } from "../_hooks/documentSearchRouteAPI";

export function SearchOptionsMenu() {
  // local state
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  // global client state (url)
  const search = DocumentSearchRouteAPI.useSearch();
  const navigate = DocumentSearchRouteAPI.useNavigate();
  const expertMode = search[FILTER_EXPERT_MODE_PARAM] === true;

  return (
    <>
      <Tooltip title="Search options">
        <IconButton onClick={(event) => setAnchorEl(anchorEl ? null : event.currentTarget)}>
          {getIconComponent(Icon.SETTINGS)}
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
            control={
              <Switch
                checked={expertMode}
                onChange={(event) =>
                  navigate({
                    search: (prev) => ({
                      ...prev,
                      [FILTER_EXPERT_MODE_PARAM]: event.target.checked,
                    }),
                    replace: true,
                  })
                }
              />
            }
            label="Expert search"
            sx={{ ml: "-9px" }}
          />
          <Button
            size="small"
            startIcon={<HelpIcon />}
            href={
              expertMode
                ? "https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-query-string-query.html"
                : "https://www.elastic.co/guide/en/elasticsearch/reference/current/query-dsl-simple-query-string-query.html#simple-query-string-syntax"
            }
            target="_blank"
          >
            Help
          </Button>
        </Box>
      </Popover>
    </>
  );
}
