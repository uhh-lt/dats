import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import AddBoxIcon from "@mui/icons-material/AddBox";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import { useForm } from "react-hook-form";
import { CodeRead } from "../../../api/openapi";
import CodeHooks from "../../../api/CodeHooks";
import { QueryKey } from "../../../api/QueryKey";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import { HexColorPicker } from "react-colorful";
import SaveIcon from "@mui/icons-material/Save";

interface CodeDialogProps {
  projectId: number;
  userId: number;
  codes: CodeRead[];
}

export default function CodeCreationDialog({ projectId, userId, codes }: CodeDialogProps) {
  // use react hook form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm();

  // local state
  const [open, setOpen] = useState(false); // state of the dialog, either open or closed
  const [selectedParent, setSelectedParent] = useState(-1);
  const [color, setColor] = useState("#000000");

  // initialize state properly
  useEffect(() => {
    setSelectedParent(-1);
    setColor("#000000");
    reset();
    setValue("color", "#000000");
  }, [setValue, reset]);

  // mutations
  const queryClient = useQueryClient();
  const createCodeMutation = CodeHooks.useCreateCode({
    onError: (error: Error) => {
      SnackbarAPI.openSnackbar({
        text: error.message,
        severity: "error",
      });
    },
    onSuccess: (data: CodeRead) => {
      queryClient.invalidateQueries([QueryKey.PROJECT_CODES, projectId]);
      queryClient.invalidateQueries([QueryKey.USER_CODES, userId]);
      setOpen(false); // close dialog
      SnackbarAPI.openSnackbar({
        text: `Added code ${data.name}`,
        severity: "success",
      });

      // reset
      reset();
      setColor("#000000");
      setValue("color", "#000000");
    },
  });

  // form handling
  const handleCodeCreation = (data: any) => {
    createCodeMutation.mutate({
      requestBody: {
        name: data.name,
        description: data.description,
        color: data.color,
        project_id: projectId,
        user_id: userId,
        ...(selectedParent !== -1 && { parent_code_id: selectedParent }),
      },
    });
  };
  const handleError = (data: any) => console.error(data);

  return (
    <React.Fragment>
      <Button variant="contained" onClick={() => setOpen(true)} startIcon={<AddBoxIcon />} sx={{ my: 0.5, mx: 2 }}>
        Add Code
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <form onSubmit={handleSubmit(handleCodeCreation, handleError)}>
          <DialogTitle>Create a new code</DialogTitle>
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
                {codes.map((codeSet) => (
                  <MenuItem key={codeSet.id} value={codeSet.id}>
                    {codeSet.name}
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
            <LoadingButton
              variant="contained"
              color="success"
              startIcon={<SaveIcon />}
              fullWidth
              type="submit"
              loading={createCodeMutation.isLoading}
              loadingPosition="start"
            >
              Create Code
            </LoadingButton>
          </DialogActions>
        </form>
      </Dialog>
    </React.Fragment>
  );
}
