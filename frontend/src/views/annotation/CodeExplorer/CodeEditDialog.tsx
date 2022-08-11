import { Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import { useForm } from "react-hook-form";
import eventBus from "../../../EventBus";
import { CodeRead } from "../../../api/openapi";
import CodeHooks from "../../../api/CodeHooks";
import { QueryKey } from "../../../api/QueryKey";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";

interface CodeEditDialogProps {
  codes: CodeRead[];
}

function CodeEditDialog({ codes }: CodeEditDialogProps) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm();

  // state
  const [code, setCode] = useState<CodeRead | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState(-1);

  // listen to event
  // create a (memoized) function that stays the same across re-renders
  const onOpenEditCode = useCallback((event: CustomEventInit) => {
    setOpen(true);
    setCode(event.detail);
  }, []);

  useEffect(() => {
    eventBus.on("open-edit-code", onOpenEditCode);
    return () => {
      eventBus.remove("open-edit-code", onOpenEditCode);
    };
  }, [onOpenEditCode]);

  // initialize form when code changes
  useEffect(() => {
    if (code) {
      reset({
        name: code.name,
        description: code.description,
        color: code.color,
      });
      setSelectedParent(!code.parent_code_id ? -1 : code.parent_code_id);
    }
  }, [code, reset]);

  // mutations
  const queryClient = useQueryClient();
  const updateCodeMutation = CodeHooks.useUpdateCode({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data: CodeRead) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_CODES]);
      setOpen(false); // close dialog
      SnackbarAPI.openSnackbar({
        text: `Updated code ${data.name}`,
        severity: "success",
      });
    },
  });

  // form handling
  const handleCodeUpdate = (data: any) => {
    if (code) {
      updateCodeMutation.mutate({
        requestBody: {
          name: data.name,
          description: data.description,
          color: data.color,
          ...(selectedParent !== -1 && { parent_code_id: selectedParent }),
        },
        codeId: code.id,
      });
    }
  };
  const handleError = (data: any) => console.error(data);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit(handleCodeUpdate, handleError)}>
        <DialogTitle>Edit code {code?.name}</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            <TextField
              fullWidth
              select
              label="Parent Code"
              variant="filled"
              value={selectedParent}
              onChange={(e) => setSelectedParent(parseInt(e.target.value))}
            >
              <MenuItem key={-1} value={-1}>
                No parent
              </MenuItem>
              {codes
                .filter((c) => c.id !== code?.id)
                .map((code) => (
                  <MenuItem key={code.id} value={code.id}>
                    {code.name}
                  </MenuItem>
                ))}
            </TextField>

            <TextField
              label="Name"
              fullWidth
              variant="standard"
              {...register("name", { required: "Code name is required" })}
              error={Boolean(errors.name)}
              helperText={<ErrorMessage errors={errors} name="name" />}
            />
            <TextField
              label="Color"
              fullWidth
              variant="standard"
              {...register("color", { required: "Color is required" })}
              error={Boolean(errors.color)}
              helperText={<ErrorMessage errors={errors} name="color" />}
            />
            <TextField
              multiline
              minRows={5}
              label="Description"
              fullWidth
              variant="standard"
              {...register("description", { required: "Description is required" })}
              error={Boolean(errors.description)}
              helperText={<ErrorMessage errors={errors} name="description" />}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <LoadingButton
            variant="contained"
            color="success"
            fullWidth
            type="submit"
            disabled={!code}
            loading={updateCodeMutation.isLoading}
            loadingPosition="start"
          >
            Update Code
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}

export default CodeEditDialog;
