import { ApiKeyHooks } from "@api/hooks/ApiKeyHooks";
import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormMenu, FormText } from "@components/form-inputs";
import { useOpenSnackbar } from "@core/notification";
import { ErrorMessage } from "@hookform/error-message";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { ApiKeyCreatedResponse } from "@models/ApiKeyCreatedResponse";
import { ExpiryDuration } from "@models/ExpiryDuration";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SaveIcon from "@mui/icons-material/Save";
import { Alert, Button, Dialog, DialogActions, DialogContent, MenuItem, Stack, TextField } from "@mui/material";
import { useCallback, useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";

interface ApiKeyCreateDialogProps {
  open: boolean;
  onClose: () => void;
}

interface ApiKeyCreateFormValues {
  name: string;
  expiresIn: ExpiryDuration;
}

const expiryDurationLabels: Record<ExpiryDuration, string> = {
  [ExpiryDuration._1_MONTH]: "1 month",
  [ExpiryDuration._3_MONTHS]: "3 months",
  [ExpiryDuration._6_MONTHS]: "6 months",
  [ExpiryDuration._1_YEAR]: "1 year",
  [ExpiryDuration._3_YEARS]: "3 years",
  [ExpiryDuration.NEVER]: "Never",
};

export function ApiKeyCreateDialog({ open, onClose }: ApiKeyCreateDialogProps) {
  // local client state: the newly created key (plaintext is only available once, right after creation)
  const [createdKey, setCreatedKey] = useState<ApiKeyCreatedResponse | null>(null);

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // form
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<ApiKeyCreateFormValues>({
    defaultValues: {
      name: "",
      expiresIn: ExpiryDuration._1_YEAR,
    },
  });

  // form actions
  const { mutate: createApiKeyMutation, isPending } = ApiKeyHooks.useCreateApiKey();
  const handleApiKeyCreation = useCallback<SubmitHandler<ApiKeyCreateFormValues>>(
    (data) => {
      createApiKeyMutation(
        { name: data.name, expiresIn: data.expiresIn },
        {
          onSuccess: (createdKey) => {
            setCreatedKey(createdKey);
          },
        },
      );
    },
    [createApiKeyMutation],
  );
  const handleError: SubmitErrorHandler<ApiKeyCreateFormValues> = (data) => console.error(data);

  const handleCopyKey = useCallback(() => {
    if (!createdKey) return;
    navigator.clipboard
      .writeText(createdKey.api_key)
      .then(() => openSnackbar({ text: "Copied API key to clipboard", severity: "success" }))
      .catch(() => openSnackbar({ text: "Failed to copy API key to clipboard", severity: "error" }));
  }, [createdKey, openSnackbar]);

  const handleClose = useCallback(() => {
    reset({ name: "", expiresIn: ExpiryDuration._1_YEAR });
    setCreatedKey(null);
    onClose();
  }, [reset, onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMaximized}
      component="form"
      onSubmit={handleSubmit(handleApiKeyCreation, handleError)}
    >
      <DATSDialogHeader
        title="Create a new API key"
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      {createdKey ? (
        <>
          <DialogContent>
            <Stack spacing={3}>
              <Alert severity="warning">
                Make sure to copy your API key now. You will not be able to see it again!
              </Alert>
              <TextField
                label={`API key for "${createdKey.name}"`}
                value={createdKey.api_key}
                fullWidth
                slotProps={{
                  input: {
                    readOnly: true,
                    sx: { fontFamily: "monospace" },
                  },
                  inputLabel: { shrink: true },
                }}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button variant="outlined" onClick={handleClose} fullWidth>
              Close
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleCopyKey}
              startIcon={<ContentCopyIcon />}
              fullWidth
            >
              Copy API Key
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent>
            <Stack spacing={3}>
              <FormText
                name="name"
                rules={{
                  required: "Name is required",
                }}
                control={control}
                textFieldProps={{
                  label: "Name",
                  variant: "standard",
                  fullWidth: true,
                  error: Boolean(errors.name),
                  helperText: <ErrorMessage errors={errors} name="name" />,
                  slotProps: {
                    inputLabel: { shrink: true },
                  },
                  autoFocus: true,
                }}
              />
              <FormMenu
                name="expiresIn"
                rules={{
                  required: "Expiration is required",
                }}
                control={control}
                textFieldProps={{
                  label: "Expires in",
                  variant: "standard",
                  fullWidth: true,
                  error: Boolean(errors.expiresIn),
                  helperText: <ErrorMessage errors={errors} name="expiresIn" />,
                  slotProps: {
                    inputLabel: { shrink: true },
                  },
                }}
              >
                {Object.values(ExpiryDuration).map((expiryDuration) => (
                  <MenuItem key={expiryDuration} value={expiryDuration}>
                    {expiryDurationLabels[expiryDuration]}
                  </MenuItem>
                ))}
              </FormMenu>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button
              variant="contained"
              color="success"
              type="submit"
              startIcon={<SaveIcon />}
              fullWidth
              loading={isPending}
              loadingPosition="start"
            >
              Create API Key
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
