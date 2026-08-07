import { LLMHooks } from "@api/hooks/LLMHooks";
import { QueryKey } from "@api/hooks/QueryKey";
import { queryClient } from "@api/queryClient";
import { useTabNavigate } from "@core/navigation";
import { ApproachType } from "@models/ApproachType";
import { SentenceAnnotationLLMJobResult } from "@models/SentenceAnnotationLLMJobResult";
import { Button, CircularProgress, DialogActions, DialogContent, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { ASSISTANT_FEWSHOT_ID, ASSISTANT_ZEROSHOT_ID } from "@utils/GlobalConstants";
import { useCallback, useMemo } from "react";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";
import { AnnotationResultSummary } from "./AnnotationResultSummary";
import { LLMUtterance } from "./LLMUtterance";

const approach2AssistantID: Record<ApproachType, number> = {
  [ApproachType.LLM_ZERO_SHOT]: ASSISTANT_ZEROSHOT_ID,
  [ApproachType.LLM_FEW_SHOT]: ASSISTANT_FEWSHOT_ID,
};

export function SentenceAnnotationResultStep() {
  // get the job
  const llmJobId = useAppSelector((state) => state.llmAssistant.llmJobId);
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
    dispatch(LLMAssistantActions.closeLLMDialog());
  }, [dispatch]);

  const projectId = useAppSelector((state) => state.project.projectId);
  const tabNavigate = useTabNavigate();

  // the first document that actually got annotations
  const firstAnnotatedSdocId = useMemo(
    () => jobResult.results.find((r) => r.suggested_annotations.length > 0)?.sdoc_id,
    [jobResult.results],
  );

  const handleOpenFirstDocument = () => {
    if (!projectId || firstAnnotatedSdocId === undefined) return;

    dispatch(LLMAssistantActions.closeLLMDialog());
    tabNavigate({
      params: { projectId, sdocId: firstAnnotatedSdocId },
      to: "/project/$projectId/annotation/$sdocId",
      search: {
        compareWithUserId: approach2AssistantID[approachType],
        visibleUserId: undefined,
        selectedAnnotationId: undefined,
      },
    });

    // reload annotations
    queryClient.invalidateQueries({
      queryKey: [QueryKey.SDOC_SENTENCE_ANNOTATOR, firstAnnotatedSdocId, approach2AssistantID[approachType]],
    });
  };

  return (
    <>
      <LLMUtterance p={3}>
        <AnnotationResultSummary results={jobResult.results} annotationWording="sentence" />
        {firstAnnotatedSdocId !== undefined && (
          <>
            <Typography mt={1}>
              You can now view the results in the Sentence Annotator. My suggestions for the next steps are the
              following:
            </Typography>
            <ul style={{ margin: 0 }}>
              <li>Open a document in the Annotator</li>
              <li>Change to the sentence annotation mode</li>
              <li>Use the "Compare with" feature to compare your annotations with mine</li>
              <li>Apply correct & validated annotations to your document, so that I can learn from your feedback</li>
            </ul>
            <Typography mt={0.5}>You should look through all documents I annotated.</Typography>
          </>
        )}
      </LLMUtterance>
      <DialogActions>
        <Button onClick={handleClose}>Close dialog</Button>
        <Button variant="contained" onClick={handleOpenFirstDocument} disabled={firstAnnotatedSdocId === undefined}>
          Open first document
        </Button>
      </DialogActions>
    </>
  );
}
