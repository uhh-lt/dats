import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import React, { useState } from "react";
import {
  Card,
  CardContent,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormLabel,
  Popover,
  Radio,
  RadioGroup,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { SearchActions } from "../searchSlice";
import { SearchType } from "../SearchType";

interface SearchBarAdvancedProps {
  anchorElRef: React.MutableRefObject<HTMLFormElement | null>;
}

function SearchBarAdvanced({ anchorElRef }: SearchBarAdvancedProps) {
  // local state
  const [open, setOpen] = useState<HTMLFormElement | null>(null);

  // global client state (redux)
  const findTextModality = useAppSelector((state) => state.search.findTextModality);
  const findImageModality = useAppSelector((state) => state.search.findImageModality);
  const searchType = useAppSelector((state) => state.search.searchType);
  const dispatch = useAppDispatch();

  // ui events
  const handleOpen = () => {
    setOpen(anchorElRef.current);
  };
  const handleClose = () => {
    setOpen(null);
  };

  return (
    <>
      <Tooltip title="Advanced search options">
        <span>
          <IconButton sx={{ p: "10px" }} onClick={handleOpen}>
            <TuneIcon />
          </IconButton>
        </span>
      </Tooltip>
      <Popover
        container={open}
        id="search-menu"
        open={open !== null}
        anchorEl={open}
        onClose={handleClose}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        elevation={8}
        PaperProps={{}}
        disablePortal
      >
        <Card>
          <CardContent>
            <FormControl component="fieldset" variant="standard" sx={{ mr: 3 }}>
              <FormLabel component="legend">Result modalities</FormLabel>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      name="Text"
                      onChange={() => dispatch(SearchActions.toggleFindTextModality())}
                      checked={findTextModality}
                    />
                  }
                  label="Text"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      name="Image"
                      onChange={() => dispatch(SearchActions.toggleFindImageModality())}
                      checked={findImageModality}
                    />
                  }
                  label="Image"
                />
              </FormGroup>
            </FormControl>
            <FormControl>
              <FormLabel id="radio-buttons-group-query">Query Type</FormLabel>
              <RadioGroup
                aria-labelledby="radio-buttons-group-query"
                value={searchType}
                onChange={(event, value) => dispatch(SearchActions.setSearchType(value as SearchType))}
                name="radio-buttons-group"
              >
                <FormControlLabel value={SearchType.CONTENT} control={<Radio />} label="Content" />
                <FormControlLabel value={SearchType.SENTENCE} control={<Radio />} label="Sentence" />
                <FormControlLabel value={SearchType.FILE} control={<Radio />} label="File name" />
              </RadioGroup>
            </FormControl>
          </CardContent>
        </Card>
      </Popover>
    </>
  );
}

export default SearchBarAdvanced;
