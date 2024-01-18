import ClearIcon from "@mui/icons-material/Clear";
import HelpIcon from "@mui/icons-material/Help";
import SearchIcon from "@mui/icons-material/Search";
import {
  Box,
  Button,
  Card,
  CardContent,
  ClickAwayListener,
  FormControl,
  FormControlLabel,
  FormLabel,
  IconButton,
  InputBase,
  Paper,
  Popper,
  Radio,
  RadioGroup,
  Switch,
  Tooltip,
} from "@mui/material";
import React, { useRef, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { useParams } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks";
import { QueryType } from "../QueryType";
import { useNavigateIfNecessary } from "../hooks/useNavigateIfNecessary";
import { SearchActions } from "../searchSlice";

interface SearchFormValues {
  query: string | number;
}

interface SearchBarProps {
  placeholder: string;
}

function SearchBar({ placeholder }: SearchBarProps) {
  const projectId = parseInt((useParams() as { projectId: string }).projectId);
  const container = useRef<HTMLFormElement | null>(null);
  const navigateIfNecessary = useNavigateIfNecessary();

  // global client state (redux)
  const searchType = useAppSelector((state) => state.search.searchType);
  const searchQuery = useAppSelector((state) => state.search.searchQuery);
  const expertMode = useAppSelector((state) => state.search.expertMode);
  const dispatch = useAppDispatch();

  // react hook form
  const { register, handleSubmit, reset } = useForm<SearchFormValues>({
    values: {
      query: searchQuery,
    },
  });

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

  const onSubmit: SubmitHandler<SearchFormValues> = (data) => {
    dispatch(SearchActions.onChangeSearchQuery(data.query));
    dispatch(SearchActions.clearSelectedDocuments());
    navigateIfNecessary(`/project/${projectId}/search/`);

    handleClose();
    reset({
      query: data.query,
    });
  };

  const onSubmitError: SubmitErrorHandler<SearchFormValues> = (errors) => {
    console.error(errors);
  };

  const handleClearSearch = (event: React.MouseEvent<HTMLButtonElement>) => {
    dispatch(SearchActions.onClearSearch());
    navigateIfNecessary(`/project/${projectId}/search/`);

    handleClose();
    reset({
      query: "",
    });
  };

  return (
    <ClickAwayListener onClickAway={handleClose}>
      <Paper
        elevation={0}
        component="form"
        onSubmit={handleSubmit(onSubmit, onSubmitError)}
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
            <IconButton sx={{ p: "10px" }} onClick={handleClearSearch}>
              <ClearIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Popper
          open={open}
          anchorEl={anchorEl}
          sx={{ zIndex: (theme) => theme.zIndex.appBar + 1, width: "800px" }}
          style={{ marginTop: "-3px !important" }}
        >
          <Card variant="outlined" sx={{ borderTop: "none", borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
            <CardContent
              sx={{
                display: "flex",
                flexDirection: "row",
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
                  sx={{ ml: 0.25 }}
                />
                <br></br>
                <Button
                  size="small"
                  startIcon={<HelpIcon />}
                  sx={{ ml: 1 }}
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
              <Box flexGrow={1} />
              <FormControl>
                <FormLabel id="radio-buttons-group-query">Query Type</FormLabel>
                <RadioGroup
                  row
                  aria-labelledby="radio-buttons-group-query"
                  value={searchType}
                  onChange={(_event, value) => dispatch(SearchActions.setSearchType(value as QueryType))}
                  name="radio-buttons-group"
                >
                  {Object.values(QueryType).map((qt) => (
                    <FormControlLabel key={qt} value={qt} control={<Radio />} label={qt} />
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
