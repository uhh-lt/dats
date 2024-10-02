import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import React from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import FeedbackHooks from "../../api/FeedbackHooks.ts";
import FormTextMultiline from "../../components/FormInputs/FormTextMultiline.tsx";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";

interface FeedbackFormValues {
  content: string;
}

interface FeedbackDialogProps {
  setIsFeedbackDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  locPathName: string;
}

function FeedbackDialog({ setIsFeedbackDialogOpen, locPathName }: FeedbackDialogProps) {
  // react form
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<FeedbackFormValues>();

  // mutations
  const createMutation = FeedbackHooks.useCreateFeedback();

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // close dialog event handler
  const closeFeedbackDialog = () => {
    setIsFeedbackDialogOpen(false);
  };

  // form event handlers
  const handleSubmitFeedback: SubmitHandler<FeedbackFormValues> = (data) => {
    createMutation.mutate(
      {
        requestBody: {
          user_content: `URL: ${locPathName}\n${data.content}`,
        },
      },
      {
        onSuccess: () => {
          openSnackbar({
            text: `Thanks for your feedback!`,
            severity: "success",
          });
          closeFeedbackDialog();
        },
      },
    );
  };
  const handleError: SubmitErrorHandler<FeedbackFormValues> = (data) => console.error(data);

  return (
    <form onSubmit={handleSubmit(handleSubmitFeedback, handleError)}>
      <DialogTitle>Submit your feedback</DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          <FormTextMultiline
            name="content"
            control={control}
            rules={{
              required: "Content is required",
            }}
            textFieldProps={{
              label: "Feedback",
              variant: "standard",
              fullWidth: true,
              error: Boolean(errors.content),
              helperText: <ErrorMessage errors={errors} name="content" />,
            }}
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
          loading={createMutation.isPending}
          loadingPosition="start"
        >
          Submit Feedback
        </LoadingButton>
      </DialogActions>
    </form>
  );
}

export default FeedbackDialog;
