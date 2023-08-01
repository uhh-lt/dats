import { Stack } from "@mui/material";
import { FeedbackRead } from "../../api/openapi";
import FeedbackCard from "./FeedbackCard";

interface FeedbackCardsProps {
  feedback: FeedbackRead[];
  showReplyTo: boolean;
}

function FeedbackCards({ feedback, showReplyTo }: FeedbackCardsProps) {
  return (
    <Stack spacing={2} px={0.5} pb={2}>
      {feedback.map((feedback) => (
        <FeedbackCard feedback={feedback} showReplyTo={showReplyTo} />
      ))}
    </Stack>
  );
}

export default FeedbackCards;
