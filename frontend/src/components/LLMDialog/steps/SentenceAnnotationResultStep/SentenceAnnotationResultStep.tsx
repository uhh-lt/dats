import { Button, CircularProgress, DialogActions, DialogContent, Typography } from "@mui/material";
import { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LLMHooks from "../../../../api/LLMHooks.ts";
import { ApproachType } from "../../../../api/openapi/models/ApproachType.ts";
import { SentenceAnnotationLLMJobResult } from "../../../../api/openapi/models/SentenceAnnotationLLMJobResult.ts";
import { QueryKey } from "../../../../api/QueryKey.ts";
import queryClient from "../../../../plugins/ReactQueryClient.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { ASSISTANT_FEWSHOT_ID, ASSISTANT_ZEROSHOT_ID } from "../../../../utils/GlobalConstants.ts";
import { AnnoActions } from "../../../../views/annotation/annoSlice.ts";
import { CRUDDialogActions } from "../../../dialogSlice.ts";
import LLMUtterance from "../LLMUtterance.tsx";

const approach2AssistantID: Record<ApproachType, number> = {
  [ApproachType.LLM_ZERO_SHOT]: ASSISTANT_ZEROSHOT_ID,
  [ApproachType.LLM_FEW_SHOT]: ASSISTANT_FEWSHOT_ID,
};

function SentenceAnnotationResultStep() {
  // get the job
  const llmJobId = useAppSelector((state) => state.dialog.llmJobId);
  const llmJob = LLMHooks.usePollLLMJob(llmJobId, undefined);

  if (llmJob.isSuccess && llmJob.data.output) {
    return (
      <SentenceAnnotationResultStepContent
        jobResult={llmJob.data.output.specific_task_result as SentenceAnnotationLLMJobResult}
        approachType={llmJob.data.input.llm_approach_type}
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

function SentenceAnnotationResultStepContent({
  jobResult,
  approachType,
}: {
  jobResult: SentenceAnnotationLLMJobResult;
  approachType: ApproachType;
}) {
  // actions
  const dispatch = useAppDispatch();
  const handleClose = useCallback(() => {
    dispatch(CRUDDialogActions.closeLLMDialog());
  }, [dispatch]);

  const projectId = parseInt((useParams() as { projectId: string }).projectId);
  const navigate = useNavigate();
  const handleOpenFirstDocument = () => {
    const firstSdocId = jobResult.results[0].sdoc_id;

    dispatch(CRUDDialogActions.closeLLMDialog());
    dispatch(AnnoActions.compareWithUser(approach2AssistantID[approachType]));
    navigate(`/project/${projectId}/annotation/${firstSdocId}`);

    // reload annotations
    queryClient.invalidateQueries({
      queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR, firstSdocId, approach2AssistantID[approachType]],
    });
  };

  return (
    <>
      <LLMUtterance p={3}>
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
      <DialogActions>
        <Button onClick={handleClose}>Close dialog</Button>
        <Button variant="contained" onClick={handleOpenFirstDocument}>
          Open first document
        </Button>
      </DialogActions>
    </>
  );
}

export default SentenceAnnotationResultStep;
