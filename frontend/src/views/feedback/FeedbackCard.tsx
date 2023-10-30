import { ErrorMessage } from "@hookform/error-message";
import ReplyIcon from "@mui/icons-material/Reply";
import SendIcon from "@mui/icons-material/Send";
import { LoadingButton } from "@mui/lab";
import { Button, Card, CardActions, CardContent, CardHeader, Collapse, TextField, Typography } from "@mui/material";
import React from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import FeedbackHooks from "../../api/FeedbackHooks";
import { FeedbackRead } from "../../api/openapi";
import UserName from "../../components/UserName";
import SnackbarAPI from "../../features/Snackbar/SnackbarAPI";

type FeedbackReplyValues = {
  message: string;
};

interface FeedbackCardProps {
  feedback: FeedbackRead;
  showReplyTo: boolean;
}

function FeedbackCard({ feedback, showReplyTo }: FeedbackCardProps) {
  // local client state
  const [expanded, setExpanded] = React.useState(false);

  // react form
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FeedbackReplyValues>();

  // mutations
  const replyToFeedbackMutation = FeedbackHooks.useReplyTo();

  // react form handlers
  const handleSubmitCodeCreateDialog: SubmitHandler<FeedbackReplyValues> = (data) => {
    replyToFeedbackMutation.mutate(
      {
        feedbackId: feedback.id,
        message: data.message,
      },
      {
        onSuccess: (data) => {
          SnackbarAPI.openSnackbar({
            text: data,
            severity: "success",
          });
          reset();
          setExpanded(false);
        },
      },
    );
  };

  const handleErrorCodeCreateDialog: SubmitErrorHandler<FeedbackReplyValues> = (data) => console.error(data);

  return (
    <Card>
      <form onSubmit={handleSubmit(handleSubmitCodeCreateDialog, handleErrorCodeCreateDialog)}>
        <CardHeader
          title={
            <>
              <UserName userId={feedback.user_id} /> says:
            </>
          }
        />
        <CardContent>
          <Typography style={{ whiteSpace: "pre-wrap" }}>{feedback.user_content}</Typography>
        </CardContent>
        {showReplyTo && (
          <>
            {!expanded ? (
              <CardActions>
                <Button
                  sx={{ ml: "auto" }}
                  variant="outlined"
                  startIcon={<ReplyIcon />}
                  onClick={() => setExpanded(true)}
                >
                  Reply
                </Button>
              </CardActions>
            ) : (
              <CardActions>
                <Button sx={{ ml: "auto" }} onClick={() => setExpanded(false)}>
                  Cancel
                </Button>
                <LoadingButton
                  variant="outlined"
                  startIcon={<SendIcon />}
                  type="submit"
                  loading={replyToFeedbackMutation.isLoading}
                  loadingPosition="start"
                >
                  Send message
                </LoadingButton>
              </CardActions>
            )}
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <CardContent>
                <TextField
                  multiline
                  minRows={5}
                  label="Message"
                  fullWidth
                  variant="outlined"
                  {...register("message", { required: "Message is required", minLength: 1 })}
                  error={Boolean(errors.message)}
                  helperText={<ErrorMessage errors={errors} name="message" />}
                />
              </CardContent>
            </Collapse>
          </>
        )}
      </form>
    </Card>
  );
}

export default FeedbackCard;
