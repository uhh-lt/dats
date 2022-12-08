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
import { QueryType } from "../QueryType";
import { DocType } from "../../../api/openapi";

interface SearchBarAdvancedProps {
  anchorElRef: React.MutableRefObject<HTMLFormElement | null>;
}

function SearchBarAdvanced({ anchorElRef }: SearchBarAdvancedProps) {
  // local state
  const [open, setOpen] = useState<HTMLFormElement | null>(null);

  // global client state (redux)
  const resultModalities = useAppSelector((state) => state.search.resultModalities);
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
                      onChange={() => dispatch(SearchActions.toggleModality(DocType.TEXT))}
                      checked={resultModalities.indexOf(DocType.TEXT) !== -1}
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
                    />
                  }
                  label="Video"
                />
              </FormGroup>
            </FormControl>
            <FormControl>
              <FormLabel id="radio-buttons-group-query">Query Type</FormLabel>
              <RadioGroup
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
      </Popover>
    </>
  );
}

export default SearchBarAdvanced;
