import { Button, CircularProgress, DialogActions, DialogContent, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import LLMHooks from "../../../../api/LLMHooks.ts";
import { SentenceAnnotationLLMJobResult } from "../../../../api/openapi/models/SentenceAnnotationLLMJobResult.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { AnnoActions } from "../../../../views/annotation/annoSlice.ts";
import { CRUDDialogActions } from "../../../dialogSlice.ts";
import LLMUtterance from "../LLMUtterance.tsx";

function SentenceAnnotationResultStep() {
  // get the job
  const llmJobId = useAppSelector((state) => state.dialog.llmJobId);
  const llmJob = LLMHooks.usePollLLMJob(llmJobId, undefined);

  if (llmJob.isSuccess && llmJob.data.result) {
    return (
      <SentenceAnnotationResultStepContent
        jobResult={llmJob.data.result.specific_task_result as SentenceAnnotationLLMJobResult}
      />
    );
  } else if (llmJob.isLoading) {
    return (
      <DialogContent>
        <CircularProgress />
      </DialogContent>
    );
  } else if (llmJob.isError) {
    return <DialogContent>{llmJob.error.message}</DialogContent>;
  } else {
    return <></>;
  }
}

function SentenceAnnotationResultStepContent({ jobResult }: { jobResult: SentenceAnnotationLLMJobResult }) {
  // actions
  const dispatch = useAppDispatch();
  const handleClose = () => {
    dispatch(CRUDDialogActions.closeLLMDialog());
  };

  const projectId = parseInt((useParams() as { projectId: string }).projectId);
  const navigate = useNavigate();
  const handleOpen = () => {
    dispatch(CRUDDialogActions.closeLLMDialog());
    dispatch(AnnoActions.compareWithUser(1));
    navigate(`/project/${projectId}/annotation/${jobResult.results[0].sdoc_id}`);
  };

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>
            I am done with annotating the sentences. You can now view the results in the Sentence Annotator. My
            suggestions for the next steps are the following:
          </Typography>
          <ul style={{ margin: 0 }}>
            <li>Open a document in the Annotator</li>
            <li>Change to the sentence annotation mode</li>
            <li>Use the "Compare with" feature to compare your annotations with mine</li>
            <li>Apply correct & validated annotations to your document, so that I can learn from your feedback</li>
          </ul>
          <Typography mt={0.5}>You should look through all documents I annotated.</Typography>
        </LLMUtterance>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Close dialog</Button>
        <Button variant="contained" onClick={handleOpen}>
          Open first document
        </Button>
      </DialogActions>
    </>
  );
}

export default SentenceAnnotationResultStep;
