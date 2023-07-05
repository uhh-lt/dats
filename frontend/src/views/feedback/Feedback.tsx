import { Box, Container, Stack, Typography } from "@mui/material";
import FeedbackHooks from "../../api/FeedbackHooks";
import FeedbackCard from "./FeedbackCard";

function Feedback() {
  const feedback = FeedbackHooks.useGetAllFeedback();

  return (
    <Box style={{ height: "100%", overflowY: "auto" }}>
      <Container maxWidth="md">
        <Typography variant={"h4"} gutterBottom mt={3}>
          Feedback:
        </Typography>
        <Stack spacing={2} px={0.5} pb={2}>
          {feedback.isSuccess ? (
            <>
              {feedback.data.map((feedback) => (
                <FeedbackCard feedback={feedback} />
              ))}
            </>
          ) : feedback.isError ? (
            <>Error: {feedback.error.message}</>
          ) : (
            <>Loading...</>
          )}
        </Stack>
      </Container>
    </Box>
  );
}

export default Feedback;
