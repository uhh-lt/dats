import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField } from "@mui/material";
import React, { useEffect, useState } from "react";
import AddBoxIcon from "@mui/icons-material/AddBox";
import { useQueryClient } from "@tanstack/react-query";
import SnackbarAPI from "../../../features/snackbar/SnackbarAPI";
import { useForm } from "react-hook-form";
import { CodeRead } from "../../../api/openapi";
import CodeHooks from "../../../api/CodeHooks";
import { QueryKey } from "../../../api/QueryKey";
import { ErrorMessage } from "@hookform/error-message";

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
  } = useForm();

  // state
  const [open, setOpen] = useState(false); // state of the dialog, either open or closed
  const [selectedParent, setSelectedParent] = useState(-1);

  // initialize state properly
  useEffect(() => {
    setSelectedParent(-1);
    reset();
  }, [reset]);

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
      reset(); // reset form
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
            <Button variant="contained" color="success" fullWidth type="submit" disabled={createCodeMutation.isLoading}>
              {createCodeMutation.isLoading ? "Creating code..." : "Create Code"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </React.Fragment>
  );
}
