import FeedbackHooks from "../../api/FeedbackHooks";
import SnackbarAPI from "../Snackbar/SnackbarAPI";
import { DialogActions, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import { ErrorMessage } from "@hookform/error-message";
import { LoadingButton } from "@mui/lab";
import React from "react";
import { useForm } from "react-hook-form";
import SaveIcon from "@mui/icons-material/Save";
import { UserRead } from "../../api/openapi";
import { QueryObserverResult } from "@tanstack/react-query";

interface FeedbackDialogProps {
  setIsFeedbackDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  user: QueryObserverResult<UserRead, Error>;
  isLoggedIn: boolean;
  locPathName: string;
}

function FeedbackDialog({ setIsFeedbackDialogOpen, user, isLoggedIn, locPathName }: FeedbackDialogProps) {
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
    if (user.data) {
      createMutation.mutate(
        {
          requestBody: {
            user_id: user.data.id,
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
        }
      );
    }
  };
  const handleError = (data: any) => console.error(data);

  return (
    <>
      {isLoggedIn ? (
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
