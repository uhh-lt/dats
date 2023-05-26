import ClearIcon from "@mui/icons-material/Clear";
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
  Radio,
  RadioGroup,
  Tooltip,
} from "@mui/material";
import React, { useRef, useState } from "react";
import { UseFormRegister } from "react-hook-form";
import { DocType } from "../../../api/openapi";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { QueryType } from "../QueryType";
import { SearchActions } from "../searchSlice";
import ImageIcon from "@mui/icons-material/Image";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import FeedIcon from "@mui/icons-material/Feed";
import FeedOutlinedIcon from "@mui/icons-material/FeedOutlined";
import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import AudiotrackOutlinedIcon from "@mui/icons-material/AudiotrackOutlined";
import MovieIcon from "@mui/icons-material/Movie";
import MovieOutlinedIcon from "@mui/icons-material/MovieOutlined";

interface SearchBarProps {
  register: UseFormRegister<Record<string, any>>;
  handleSubmit: any;
  handleClearSearch: () => void;
  placeholder: string;
}

function SearchBar({ handleSubmit, register, handleClearSearch, placeholder }: SearchBarProps) {
  const container = useRef<HTMLFormElement | null>(null);

  // global client state (redux)
  const resultModalities = useAppSelector((state) => state.search.resultModalities);
  const searchType = useAppSelector((state) => state.search.searchType);
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
          zIndex: (theme) => theme.zIndex.appBar + 1,
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
          sx={{ zIndex: (theme) => theme.zIndex.appBar + 1, width: "800px" }}
          style={{ marginTop: "-3px !important" }}
        >
          <Card
            elevation={0}
            variant="outlined"
            sx={{ borderTop: "none", borderTopLeftRadius: 0, borderTopRightRadius: 0 }}
          >
            <CardContent>
              <FormControl component="fieldset" variant="standard" sx={{ mr: 3 }}>
                <FormLabel component="legend">Result modalities</FormLabel>
                <FormGroup row>
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="Text"
                        onChange={() => dispatch(SearchActions.toggleModality(DocType.TEXT))}
                        checked={resultModalities.indexOf(DocType.TEXT) !== -1}
                        checkedIcon={<FeedIcon />}
                        icon={<FeedOutlinedIcon />}
                      />
                    }
                    label="Text"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="Image"
                        onChange={() => dispatch(SearchActions.toggleModality(DocType.IMAGE))}
                        checked={resultModalities.indexOf(DocType.IMAGE) !== -1}
                        checkedIcon={<ImageIcon />}
                        icon={<ImageOutlinedIcon />}
                      />
                    }
                    label="Image"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="Audio"
                        onChange={() => dispatch(SearchActions.toggleModality(DocType.AUDIO))}
                        checked={resultModalities.indexOf(DocType.AUDIO) !== -1}
                        checkedIcon={<AudiotrackIcon />}
                        icon={<AudiotrackOutlinedIcon />}
                      />
                    }
                    label="Audio"
                  />
                  <FormControlLabel
                    control={
                      <Checkbox
                        name="Video"
                        onChange={() => dispatch(SearchActions.toggleModality(DocType.VIDEO))}
                        checked={resultModalities.indexOf(DocType.VIDEO) !== -1}
                        checkedIcon={<MovieIcon />}
                        icon={<MovieOutlinedIcon />}
                      />
                    }
                    label="Video"
                  />
                </FormGroup>
              </FormControl>
              <FormControl>
                <FormLabel id="radio-buttons-group-query">Query Type</FormLabel>
                <RadioGroup
                  row
                  aria-labelledby="radio-buttons-group-query"
                  value={searchType}
                  onChange={(event, value) => dispatch(SearchActions.setSearchType(value as QueryType))}
                  name="radio-buttons-group"
                >
                  {Object.entries(QueryType).map((qt) => (
                    <FormControlLabel key={qt[1]} value={qt[1] as QueryType} control={<Radio />} label={qt[1]} />
                  ))}
                </RadioGroup>
              </FormControl>
            </CardContent>
          </Card>
        </Popper>
      </Paper>
    </ClickAwayListener>
  );
}

export default SearchBar;
