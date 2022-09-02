import { Box, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import { useForm } from "react-hook-form";
import eventBus from "../../../EventBus";
import { CodeRead, CodeUpdate } from "../../../api/openapi";
import CodeHooks from "../../../api/CodeHooks";
import { QueryKey } from "../../../api/QueryKey";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import { HexColorPicker } from "react-colorful";
import ColorUtils from "../../../utils/ColorUtils";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import { SYSTEM_USER_ID } from "../../../utils/GlobalConstants";

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
    setValue,
  } = useForm();

  // local state
  const [code, setCode] = useState<CodeRead | null>(null);
  const [open, setOpen] = useState(false);
  const [selectedParent, setSelectedParent] = useState(-1);
  const [color, setColor] = useState("#000000");

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
      const c = ColorUtils.rgbStringToHex(code.color) || code.color;
      reset({
        name: code.name,
        description: code.description,
        color: c,
      });
      setSelectedParent(!code.parent_code_id ? -1 : code.parent_code_id);
      setColor(c);
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
      queryClient.invalidateQueries([QueryKey.CODE, data.id]);
      queryClient.invalidateQueries([QueryKey.PROJECT_CODES]);
      setOpen(false); // close dialog
      SnackbarAPI.openSnackbar({
        text: `Updated code ${data.name}`,
        severity: "success",
      });
    },
  });
  const deleteCodeMutation = CodeHooks.useDeleteCode({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data: CodeRead) => {
      queryClient.invalidateQueries([QueryKey.CODE, data.id]);
      queryClient.invalidateQueries([QueryKey.PROJECT_CODES]);
      queryClient.invalidateQueries([QueryKey.USER_CODES]);
      setOpen(false); // close dialog
      SnackbarAPI.openSnackbar({
        text: `Deleted code ${data.name}`,
        severity: "success",
      });
    },
  });

  // form handling
  const handleCodeUpdate = (data: any) => {
    if (code) {
      // only allow updating of color for SYSTEM CODES
      let requestBody: CodeUpdate = {
        color: data.color,
      };

      if (code.user_id !== SYSTEM_USER_ID) {
        requestBody = {
          ...requestBody,
          name: data.name,
          description: data.description,
          ...(selectedParent !== -1 && { parent_code_id: selectedParent }),
        };
      }

      updateCodeMutation.mutate({
        requestBody,
        codeId: code.id,
      });
    }
  };
  const handleError = (data: any) => console.error(data);
  const handleCodeDelete = () => {
    // disallow deleting of SYSTEM CODES
    if (code && code.user_id !== SYSTEM_USER_ID) {
      deleteCodeMutation.mutate({ codeId: code.id });
    } else {
      throw new Error("Invalid invocation of method handleCodeDelete! Only call when code.data is available!");
    }
  };

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
              disabled={!code || code.user_id === SYSTEM_USER_ID}
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
              disabled={!code || code.user_id === SYSTEM_USER_ID}
            />
            <Stack direction="row">
              <TextField
                label="Color"
                fullWidth
                variant="standard"
                {...register("color", { required: "Color is required" })}
                onChange={(e) => setColor(e.target.value)}
                error={Boolean(errors.color)}
                helperText={<ErrorMessage errors={errors} name="color" />}
                InputLabelProps={{ shrink: true }}
              />
              <Box sx={{ width: 48, height: 48, backgroundColor: color, ml: 1, flexShrink: 0 }} />
            </Stack>
            <HexColorPicker
              style={{ width: "100%" }}
              color={color}
              onChange={(newColor) => {
                setValue("color", newColor); // set value of text input
                setColor(newColor); // set value of color picker (and box)
              }}
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
              disabled={!code || code.user_id === SYSTEM_USER_ID}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <LoadingButton
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            loading={deleteCodeMutation.isLoading}
            loadingPosition="start"
            onClick={handleCodeDelete}
            sx={{ flexShrink: 0 }}
            disabled={!code || code.user_id === SYSTEM_USER_ID}
          >
            Delete Code
          </LoadingButton>
          <LoadingButton
            variant="contained"
            color="success"
            startIcon={<SaveIcon />}
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
