import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import React from "react";
import { useForm } from "react-hook-form";
import FeedbackHooks from "../../api/FeedbackHooks";
import { UserRead } from "../../api/openapi";
import SnackbarAPI from "../Snackbar/SnackbarAPI";

interface FeedbackDialogProps {
  setIsFeedbackDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  user: UserRead;
  locPathName: string;
}

function FeedbackDialog({ setIsFeedbackDialogOpen, user, locPathName }: FeedbackDialogProps) {
  // react form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // mutations
  const createMutation = FeedbackHooks.useCreateFeedback();

  // close dialog event handler
  const closeFeedbackDialog = () => {
    setIsFeedbackDialogOpen(false);
  };

  // form event handlers
  const handleSubmitFeedback = (data: any) => {
    createMutation.mutate(
      {
        requestBody: {
          user_id: user?.id,
          user_content: `URL: ${locPathName}\n${data.content}`,
        },
      },
      {
        onSuccess: () => {
          SnackbarAPI.openSnackbar({
            text: `Thanks for your feedback!`,
            severity: "success",
          });
          closeFeedbackDialog();
        },
      },
    );
  };
  const handleError = (data: any) => console.error(data);

  return (
    <>
      {user ? (
        <form onSubmit={handleSubmit(handleSubmitFeedback, handleError)}>
          <DialogTitle>Submit your feedback</DialogTitle>
          <DialogContent>
            <Stack spacing={3}>
              <TextField
                multiline
                minRows={5}
                label="Feedback"
                fullWidth
                variant="standard"
                {...register("content", { required: "Content is required" })}
                error={Boolean(errors.content)}
                helperText={<ErrorMessage errors={errors} name="content" />}
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
              loading={createMutation.isLoading}
              loadingPosition="start"
            >
              Submit Feedback
            </LoadingButton>
          </DialogActions>
        </form>
      ) : null}
    </>
  );
}

export default FeedbackDialog;
