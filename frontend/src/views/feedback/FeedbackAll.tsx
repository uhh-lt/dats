import FeedbackHooks from "../../api/FeedbackHooks";
import FeedbackCards from "./FeedbackCards";

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
