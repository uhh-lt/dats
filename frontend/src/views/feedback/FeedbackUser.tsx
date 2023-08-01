import { useParams } from "react-router-dom";
import FeedbackHooks from "../../api/FeedbackHooks";
import FeedbackCards from "./FeedbackCards";

function FeedbackUser() {
  // global client state (react-router)
  const userId = parseInt((useParams() as { userId: string }).userId);

  const feedback = FeedbackHooks.useGetUserFeedback(userId);

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
