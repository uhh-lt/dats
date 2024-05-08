import HelpIcon from "@mui/icons-material/Help";
import SettingsIcon from "@mui/icons-material/Settings";
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  IconButton,
  Popover,
  Radio,
  RadioGroup,
  Switch,
  Tooltip,
} from "@mui/material";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { QueryType } from "../../QueryType.ts";
import { SearchActions } from "../../searchSlice.ts";

function SearchOptionsMenu() {
  // local state
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  // global client state (redux)
  const searchType = useAppSelector((state) => state.search.searchType);
  const expertMode = useAppSelector((state) => state.search.expertMode);
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
                checked={expertMode && searchType === QueryType.LEXICAL}
                onChange={(event) => dispatch(SearchActions.onChangeExpertMode(event.target.checked))}
                disabled={searchType !== QueryType.LEXICAL}
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
        <FormControl>
          <RadioGroup
            value={searchType}
            onChange={(_event, value) => dispatch(SearchActions.setSearchType(value as QueryType))}
            name="radio-buttons-group"
          >
            {Object.values(QueryType).map((qt) => (
              <FormControlLabel key={qt} value={qt} control={<Radio />} label={qt} />
            ))}
          </RadioGroup>
        </FormControl>
      </Popover>
    </>
  );
}

export default SearchOptionsMenu;
