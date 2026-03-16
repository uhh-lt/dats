import { SdocHooks } from "@api/hooks/SdocHooks";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import ClearIcon from "@mui/icons-material/Clear";
import SearchIcon from "@mui/icons-material/Search";
import { Button, CircularProgress, Dialog, DialogContent, IconButton, InputBase, Paper, Tooltip } from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { KeyboardEventHandler, MouseEventHandler, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { SentenceSearchActions } from "../../../store/sentenceSearchSlice";
import { SentenceSearchRouteAPI } from "../_hooks/sentenceSearchRouteAPI";

interface SearchFormValues {
  query: string;
}

interface SearchBarProps {
  placeholder: string;
}

export function SearchBar({ placeholder }: SearchBarProps) {
  // global client state (url search)
  const { searchQuery } = SentenceSearchRouteAPI.useSearch();
  const navigate = SentenceSearchRouteAPI.useNavigate();

  // global client state (redux)
  const dispatch = useAppDispatch();

  // react hook form
  const { register, handleSubmit, reset } = useForm<SearchFormValues>({
    values: {
      query: searchQuery || "",
    },
  });

  const onSubmit: SubmitHandler<SearchFormValues> = (data) => {
    navigate({ search: (prev) => ({ ...prev, searchQuery: data.query }) });
    dispatch(SentenceSearchActions.onClearRowSelection());
    reset({
      query: data.query,
    });
  };

  const onSubmitError: SubmitErrorHandler<SearchFormValues> = (errors) => {
    console.error(errors);
  };

  const handleClearSearch: MouseEventHandler<HTMLButtonElement> = () => {
    navigate({ search: (prev) => ({ ...prev, searchQuery: "" }) });
    dispatch(SentenceSearchActions.onClearRowSelection());
    reset({
      query: "",
    });
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === "Backspace" && typeof searchQuery === "number") {
      dispatch(SentenceSearchActions.onSearchQueryChange(""));
      dispatch(SentenceSearchActions.onClearRowSelection());
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
      {searchQuery && !isNaN(Number(searchQuery)) && <SdocImageRenderer sdocId={Number(searchQuery)} />}
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

function SdocImageRenderer({ sdocId }: { sdocId: number }) {
  const thumbnail = SdocHooks.useGetThumbnailURL(sdocId);

  const [open, setOpen] = useState(false);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

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
        <Dialog open={open} onClose={handleClose} fullScreen={isMaximized}>
          <DATSDialogHeader
            title="Image Preview"
            onClose={handleClose}
            isMaximized={isMaximized}
            onToggleMaximize={toggleMaximize}
          />
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
