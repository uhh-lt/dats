import { Box, Card, CardContent, CardHeader, Container, Stack, Typography } from "@mui/material";
import React from "react";
import FeedbackHooks from "../api/FeedbackHooks";
import UserName from "../components/UserName";

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
                <Card key={feedback.id}>
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
                </Card>
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
