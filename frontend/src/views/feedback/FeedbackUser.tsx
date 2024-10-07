import FeedbackHooks from "../../api/FeedbackHooks.ts";
import FeedbackCards from "./FeedbackCards.tsx";

function FeedbackUser() {
  const feedback = FeedbackHooks.useGetUserFeedback();

  return (
    <>
      {feedback.isSuccess ? (
        <FeedbackCards feedback={feedback.data} showReplyTo={false} />
      ) : feedback.isError ? (
        <>Error: {feedback.error.message}</>
      ) : (
        <>Loading...</>
      )}
    </>
  );
}

export default FeedbackUser;
