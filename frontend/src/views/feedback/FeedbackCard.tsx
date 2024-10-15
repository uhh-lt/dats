import { ErrorMessage } from "@hookform/error-message";
import ReplyIcon from "@mui/icons-material/Reply";
import SendIcon from "@mui/icons-material/Send";
import { LoadingButton } from "@mui/lab";
import { Button, Card, CardActions, CardContent, CardHeader, Collapse, Typography } from "@mui/material";
import React from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import FeedbackHooks from "../../api/FeedbackHooks.ts";
import { FeedbackRead } from "../../api/openapi/models/FeedbackRead.ts";
import FormTextMultiline from "../../components/FormInputs/FormTextMultiline.tsx";
import { useOpenSnackbar } from "../../components/SnackbarDialog/useOpenSnackbar.ts";
import UserName from "../../components/User/UserName.tsx";

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

  // snackbar
  const openSnackbar = useOpenSnackbar();

  // react form
  const {
    handleSubmit,
    formState: { errors },
    reset,
    control,
  } = useForm<FeedbackReplyValues>({
    defaultValues: {
      message: "",
    },
  });

  // mutations
  const replyToFeedbackMutation = FeedbackHooks.useReplyTo();

  // react form handlers
  const handleSubmitFeedbackReply: SubmitHandler<FeedbackReplyValues> = (data) => {
    replyToFeedbackMutation.mutate(
      {
        feedbackId: feedback.id,
        message: data.message,
      },
      {
        onSuccess: (data) => {
          openSnackbar({
            text: data,
            severity: "success",
          });
          reset();
          setExpanded(false);
        },
      },
    );
  };

  const handleErrorFeedbackReply: SubmitErrorHandler<FeedbackReplyValues> = (data) => console.error(data);

  return (
    <Card>
      <form onSubmit={handleSubmit(handleSubmitFeedbackReply, handleErrorFeedbackReply)}>
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
                  loading={replyToFeedbackMutation.isPending}
                  loadingPosition="start"
                >
                  Send message
                </LoadingButton>
              </CardActions>
            )}
            <Collapse in={expanded} timeout="auto" unmountOnExit>
              <CardContent>
                <FormTextMultiline
                  name="message"
                  control={control}
                  rules={{
                    required: "Message is required",
                    minLength: { value: 1, message: "Message is required" },
                  }}
                  textFieldProps={{
                    label: "Message",
                    fullWidth: true,
                    variant: "outlined",
                    error: Boolean(errors.message),
                    helperText: <ErrorMessage errors={errors} name="message" />,
                  }}
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
