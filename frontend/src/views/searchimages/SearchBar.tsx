import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import {
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  InputBase,
  Paper,
  Slide,
  Tooltip,
} from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import React from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import SdocHooks from "../../api/SdocHooks.ts";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { ImageSearchActions } from "./imageSearchSlice.ts";

interface SearchFormValues {
  query: string | number;
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

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Backspace" && typeof searchQuery === "number") {
      dispatch(ImageSearchActions.onChangeSearchQuery(""));
      dispatch(ImageSearchActions.clearSelectedDocuments());
      reset({
        query: "",
      });
    }
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
      {typeof searchQuery === "number" && <SdocImageRenderer sdocId={searchQuery} />}
      <InputBase
        sx={{ ml: 1, flex: 1 }}
        placeholder={placeholder}
        {...register("query")}
        autoComplete="off"
        onKeyDown={handleKeyDown}
      />
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

const Transition = React.forwardRef(function Transition(
  props: TransitionProps & {
    children: React.ReactElement;
  },
  ref: React.Ref<unknown>,
) {
  return <Slide direction="down" ref={ref} {...props} />;
});

function SdocImageRenderer({ sdocId }: { sdocId: number }) {
  const thumbnail = SdocHooks.useGetThumbnailURL(sdocId);

  const [open, setOpen] = React.useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  if (thumbnail.isSuccess) {
    return (
      <>
        <Button size="small" sx={{ padding: 0, minWidth: "0px" }} onClick={handleClickOpen}>
          <img
            src={thumbnail.data}
            alt="thumbnail"
            style={{
              marginLeft: "2px",
              padding: "2px",
              height: "34px",
              borderRadius: "4px",
              border: "1px solid lightgrey",
            }}
          />
        </Button>
        <Dialog open={open} TransitionComponent={Transition} keepMounted onClose={handleClose}>
          <DialogTitle>{"Image Preview"}</DialogTitle>
          <DialogContent>
            <img src={thumbnail.data} />
          </DialogContent>
        </Dialog>
      </>
    );
  } else if (thumbnail.isLoading) {
    return <CircularProgress />;
  } else if (thumbnail.isError) {
    return <span>Thumbnail not found</span>;
  }
  return <></>;
}

export default SearchBar;
