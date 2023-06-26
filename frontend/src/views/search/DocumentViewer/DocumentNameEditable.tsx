import { ErrorMessage } from "@hookform/error-message";
import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { IconButton, Stack, TextField, Tooltip, Typography, TypographyProps } from "@mui/material";
import { useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import SdocHooks from "../../../api/SdocHooks";
import SnackbarAPI from "../../../features/Snackbar/SnackbarAPI";
import DocumentLinkToOriginal from "./DocumentLinkToOriginal";

type EditFormValues = {
  name: string;
};

interface DocumentNameEditableProps {
  sdocId: number | undefined;
}

function DocumentNameEditable({ sdocId, ...props }: DocumentNameEditableProps & TypographyProps) {
  // local state
  const [isEditing, setIsEditing] = useState(false);

  // react form
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm<EditFormValues>();

  // global server state (react-query)
  const nameMetadata = SdocHooks.useGetName(sdocId);
  const updateNameMutation = SdocHooks.useUpdateName();

  // handlers
  const handleOpenEditForm = () => {
    if (nameMetadata.isSuccess) {
      setValue("name", nameMetadata.data.value);
      setIsEditing(true);
    }
  };

  const handleCloseEditForm = () => {
    setIsEditing(false);
    reset();
  };

  const handleSubmitEditForm: SubmitHandler<EditFormValues> = (data) => {
    if (nameMetadata.isSuccess) {
      if (data.name === nameMetadata.data.value) {
        handleCloseEditForm();
        return;
      }

      updateNameMutation.mutate(
        {
          metadataId: nameMetadata.data.id,
          requestBody: {
            key: nameMetadata.data.key,
            value: data.name,
          },
        },
        {
          onSuccess: (data) => {
            SnackbarAPI.openSnackbar({
              text: `Updated document name to ${data.value}`,
              severity: "success",
            });
            handleCloseEditForm();
          },
        }
      );
    }
  };

  const handleError: SubmitErrorHandler<EditFormValues> = (data) => console.error(data);

  // render
  if (isEditing) {
    return (
      <form onSubmit={handleSubmit(handleSubmitEditForm, handleError)}>
        <Stack direction={"row"} alignItems={"center"} spacing={1}>
          <TextField
            autoFocus
            InputProps={{
              sx: { m: 0 },
              inputProps: { style: { fontSize: 48, padding: 0, width: "auto" } },
            }}
            variant="standard"
            {...register("name", { required: "Name is required" })}
            error={Boolean(errors.name)}
            helperText={<ErrorMessage errors={errors} name="name" />}
          />
          <Tooltip title="Cancel">
            <IconButton onClick={handleCloseEditForm}>
              <CloseIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Save">
            <IconButton type="submit" disabled={updateNameMutation.isLoading}>
              <SaveIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </form>
    );
  } else {
    return (
      <Stack direction={"row"} alignItems={"center"} spacing={1}>
        <DocumentLinkToOriginal sdocId={sdocId}>
          <Typography {...props}>
            {nameMetadata.isSuccess ? (
              <>{nameMetadata.data.value}</>
            ) : nameMetadata.isError ? (
              <>{nameMetadata.error.message}</>
            ) : (
              <>Loading...</>
            )}
          </Typography>
        </DocumentLinkToOriginal>

        <Tooltip title="Edit name">
          <IconButton onClick={handleOpenEditForm} disabled={!nameMetadata.isSuccess}>
            <EditIcon />
          </IconButton>
        </Tooltip>
      </Stack>
    );
  }
}

export default DocumentNameEditable;
