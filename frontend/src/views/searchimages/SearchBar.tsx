import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import { IconButton, InputBase, Paper, Tooltip } from "@mui/material";
import React from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { ImageSearchActions } from "./imageSearchSlice.ts";

interface SearchFormValues {
  query: string;
}

interface SearchBarProps {
  placeholder: string;
}

function SearchBar({ placeholder }: SearchBarProps) {
  // global client state (redux)
  const searchQuery = useAppSelector((state) => state.imageSearch.searchQuery);
  const dispatch = useAppDispatch();

  // react hook form
  const { register, handleSubmit, reset } = useForm<SearchFormValues>({
    values: {
      query: searchQuery,
    },
  });

  const onSubmit: SubmitHandler<SearchFormValues> = (data) => {
    dispatch(ImageSearchActions.onChangeSearchQuery(data.query));
    dispatch(ImageSearchActions.clearSelectedDocuments());
    reset({
      query: data.query,
    });
  };

  const onSubmitError: SubmitErrorHandler<SearchFormValues> = (errors) => {
    console.error(errors);
  };

  const handleClearSearch: React.MouseEventHandler<HTMLButtonElement> = () => {
    dispatch(ImageSearchActions.onClearSearch());
    reset({
      query: "",
    });
  };

  return (
    <Paper
      variant="outlined"
      component="form"
      onSubmit={handleSubmit(onSubmit, onSubmitError)}
      sx={{
        p: "2px",
        display: "flex",
        alignItems: "center",
        maxWidth: "800px",
        zIndex: (theme) => theme.zIndex.appBar + 2,
      }}
    >
      <Tooltip title={"Search"}>
        <span>
          <IconButton type="submit" size="small">
            <SearchIcon />
          </IconButton>
        </span>
      </Tooltip>
      <InputBase sx={{ ml: 1, flex: 1 }} placeholder={placeholder} {...register("query")} autoComplete="off" />
      <Tooltip title={"Clear search"}>
        <span>
          <IconButton onClick={handleClearSearch} size="small">
            <ClearIcon />
          </IconButton>
        </span>
      </Tooltip>
    </Paper>
  );
}

export default SearchBar;
