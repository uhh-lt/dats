import ClearIcon from "@mui/icons-material/Clear";
import LabelIcon from "@mui/icons-material/Label";
import LabelOutlinedIcon from "@mui/icons-material/LabelOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  Card,
  CardContent,
  Checkbox,
  ClickAwayListener,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  IconButton,
  InputBase,
  Paper,
  Popper,
  Tooltip,
} from "@mui/material";
import React, { useRef, useState } from "react";
import { UseFormRegister } from "react-hook-form";
import { AttachedObjectType } from "../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { FILTER_OUT_TYPES } from "./Logbook";
import { LogbookActions } from "./logbookSlice";
import { MemoColors, MemoNames, MemoShortnames } from "./MemoEnumUtils";

interface SearchBarProps {
  register: UseFormRegister<Record<string, any>>;
  handleSubmit: any;
  handleClearSearch: () => void;
  placeholder: string;
}

function SearchBar({ handleSubmit, register, handleClearSearch, placeholder }: SearchBarProps) {
  const container = useRef<HTMLFormElement | null>(null);

  // global client state (redux)
  const categories = useAppSelector((state) => state.logbook.categories);
  const starred = useAppSelector((state) => state.logbook.starred);
  const dispatch = useAppDispatch();

  // local state
  const [anchorEl, setAnchorEl] = useState<HTMLFormElement | null>(null);
  const open = Boolean(anchorEl);

  // event handlers
  const handleFocus = (event: any) => {
    event.stopPropagation();
    setAnchorEl(container.current);
  };

  const handleClose = () => {
    // TODO would be better if the listener is added/removed when the search bar is opened/closed
    if (open) {
      // clear focus
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      setAnchorEl(null);
    }
  };

  const handleSubmitWrapper = (event: React.FormEvent<HTMLFormElement>) => {
    handleClose();
    handleSubmit(event);
  };

  const handleClearSearchWrapper = (event: React.MouseEvent<HTMLButtonElement>) => {
    handleClose();
    handleClearSearch();
  };

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <Paper
        elevation={0}
        component="form"
        onSubmit={handleSubmitWrapper}
        ref={container}
        sx={{
          padding: "2px",
          display: "flex",
          alignItems: "center",
          width: "100%",
          maxWidth: "800px",
          ...(open && {
            borderBottomRightRadius: 0,
            borderBottomLeftRadius: 0,
            border: `1px solid rgba(0, 0, 0, 0.12)`,
            borderBottom: "none",
          }),
        }}
      >
        <Tooltip title={"Search"}>
          <span>
            <IconButton sx={{ p: "10px" }} type="submit">
              <SearchIcon />
            </IconButton>
          </span>
        </Tooltip>
        <InputBase
          sx={{ ml: 1, flex: 1 }}
          placeholder={placeholder}
          {...register("query")}
          autoComplete="off"
          onFocus={handleFocus}
        />
        <Tooltip title={"Clear search"}>
          <span>
            <IconButton sx={{ p: "10px" }} onClick={handleClearSearchWrapper}>
              <ClearIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Popper
          open={open}
          anchorEl={anchorEl}
          disablePortal
          sx={{ zIndex: 900, width: "800px" }}
          style={{ marginTop: "-3px !important" }}
        >
          <Card
            elevation={0}
            variant="outlined"
            sx={{ borderTop: "none", borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
          >
            <CardContent>
              <FormControl component="fieldset" variant="standard" sx={{ mr: 3 }}>
                <FormLabel component="legend">Attached to</FormLabel>
                <FormGroup row>
                  {Object.values(AttachedObjectType)
                    .filter((value) => FILTER_OUT_TYPES.indexOf(value) === -1)
                    .map((key) => (
                      <FormControlLabel
                        key={MemoShortnames[key]}
                        control={
                          <Checkbox
                            name={MemoNames[key]}
                            onChange={() => dispatch(LogbookActions.toggleCategory(key))}
                            checked={categories.indexOf(key) !== -1}
                            checkedIcon={<LabelIcon style={{ color: MemoColors[key] }} />}
                            icon={<LabelOutlinedIcon style={{ color: MemoColors[key] }} />}
                          />
                        }
                        label={MemoNames[key]}
                      />
                    ))}
                </FormGroup>
              </FormControl>
              <FormControl>
                <FormLabel id="radio-buttons-group-query">Other filters</FormLabel>
                <FormGroup row>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="Starred"
                        onChange={() => dispatch(LogbookActions.toggleStarred())}
                        checked={starred}
                      />
                    }
                    label={"Starred"}
                  />
                </FormGroup>
              </FormControl>
            </CardContent>
          </Card>
        </Popper>
      </Paper>
    </ClickAwayListener>
  );
}

export default SearchBar;
