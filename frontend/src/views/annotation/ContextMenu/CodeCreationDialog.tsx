import React, { forwardRef, useImperativeHandle, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import { useParams } from "react-router-dom";
import { useAuth } from "../../../auth/AuthProvider";
import { useForm } from "react-hook-form";
import CodeHooks from "../../../api/CodeHooks";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import { CodeRead } from "../../../api/openapi";
import { useAppSelector } from "../../../plugins/ReduxHooks";
import { HexColorPicker } from "react-colorful";

interface CodeCreationDialogProps {
  onCreateSuccess: (code: CodeRead) => void;
}

export interface CodeCreationDialogHandle {
  open: (name?: string) => void;
}

// todo: refactor, this is basically the same as CodeExplorer/CodeCreationDialog.tsx
const CodeCreationDialog = forwardRef<CodeCreationDialogHandle, CodeCreationDialogProps>(({ onCreateSuccess }, ref) => {
  // global state
  const { projectId } = useParams() as { projectId: string };
  const { user } = useAuth();

  // global state (redux)
  const parentCodeId = useAppSelector((state) => state.annotations.selectedCodeId);
  const parentCode = CodeHooks.useGetCode(parentCodeId);

  // local state
  const [isCodeCreateDialogOpen, setIsCodeCreateDialogOpen] = useState(false);
  const [color, setColor] = useState("#000000");

  // react form
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
    reset,
  } = useForm();

  // mutations
  const createCodeMutation = CodeHooks.useCreateCode();

  // exposed methods (via forward ref)
  useImperativeHandle(ref, () => ({
    open: openCodeCreateDialog,
  }));

  // methods
  const openCodeCreateDialog = (name?: string) => {
    // reset
    reset();
    setValue("name", name ? name : "");
    setValue("color", "#000000");
    setColor("#000000");
    setIsCodeCreateDialogOpen(true);
  };

  const closeCodeCreateDialog = () => {
    setIsCodeCreateDialogOpen(false);
  };

  // ui event handlers
  const handleCloseCodeCreateDialog = () => {
    closeCodeCreateDialog();
  };

  // react form handlers
  const handleSubmitCodeCreateDialog = (data: any) => {
    if (user.data) {
      createCodeMutation.mutate(
        {
          requestBody: {
            name: data.name,
            description: data.description,
            color: data.color,
            project_id: parseInt(projectId),
            user_id: user.data.id,
            parent_code_id: parentCodeId,
          },
        },
        {
          onSuccess: (data) => {
            SnackbarAPI.openSnackbar({
              text: `Added new Code ${data.name}!`,
              severity: "success",
            });
            closeCodeCreateDialog();
            onCreateSuccess(data);
          },
        }
      );
    }
  };

  const handleErrorCodeCreateDialog = (data: any) => console.error(data);

  // rendering
  return (
    <Dialog open={isCodeCreateDialogOpen} onClose={handleCloseCodeCreateDialog}>
      <form onSubmit={handleSubmit(handleSubmitCodeCreateDialog, handleErrorCodeCreateDialog)}>
        <DialogTitle>Create a new code</DialogTitle>
        <DialogContent>
          <Stack spacing={3}>
            {parentCodeId && parentCode.isSuccess ? (
              <DialogContentText>
                Add your new code. It will be added as a child of {parentCode.data.name}.
              </DialogContentText>
            ) : (
              <DialogContentText>Add your new code. It will be added to the root.</DialogContentText>
            )}
            <TextField
              label="Name"
              fullWidth
              variant="standard"
              {...register("name", { required: "Name is required" })}
              error={Boolean(errors.name)}
              helperText={<ErrorMessage errors={errors} name="name" />}
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
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCodeCreateDialog}>Cancel</Button>
          <LoadingButton type="submit" loading={createCodeMutation.isLoading}>
            Create Code
          </LoadingButton>
        </DialogActions>
      </form>
    </Dialog>
  );
});

export default CodeCreationDialog;
