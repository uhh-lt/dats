import FeedbackHooks from "../../api/FeedbackHooks.ts";
import FeedbackCards from "./FeedbackCards.tsx";

function FeedbackAll() {
  const feedback = FeedbackHooks.useGetAllFeedback();

  return (
    <>
      {feedback.isSuccess ? (
        <FeedbackCards feedback={feedback.data} showReplyTo={true} />
      ) : feedback.isError ? (
        <>Error: {feedback.error.message}</>
      ) : (
        <>Loading...</>
      )}
    </>
  );
}

export default FeedbackAll;
