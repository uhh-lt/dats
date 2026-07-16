import { LLMHooks } from "@api/hooks/LLMHooks";
import { QueryKey } from "@api/hooks/QueryKey";
import { queryClient } from "@api/queryClient";
import { useTabNavigate } from "@core/navigation";
import { ApproachType } from "@models/ApproachType";
import { AnnotationLLMJobResult } from "@models/AnnotationLLMJobResult";
import { Button, CircularProgress, DialogActions, DialogContent, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { ASSISTANT_FEWSHOT_ID, ASSISTANT_ZEROSHOT_ID } from "@utils/GlobalConstants";
import { memo, useCallback } from "react";
import { LLMAssistantActions } from "../../../../store/llmAssistantSlice";
import { LLMUtterance } from "../LLMUtterance";

const approach2AssistantID: Record<ApproachType, number> = {
  [ApproachType.LLM_ZERO_SHOT]: ASSISTANT_ZEROSHOT_ID,
  [ApproachType.LLM_FEW_SHOT]: ASSISTANT_FEWSHOT_ID,
};

export const AnnotationResultStep = memo(() => {
  // get the job
  const llmJobId = useAppSelector((state) => state.llmAssistant.llmJobId);
  const llmJob = LLMHooks.usePollLLMJob(llmJobId, undefined);

  if (llmJob.isSuccess && llmJob.data.output) {
    return (
      <AnnotationResultStepContent
        jobResult={llmJob.data.output.specific_task_result as AnnotationLLMJobResult}
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
});

interface AnnotationResultStepContentProps {
  jobResult: AnnotationLLMJobResult;
  approachType: ApproachType;
}

const AnnotationResultStepContent = memo(({ jobResult, approachType }: AnnotationResultStepContentProps) => {
  // actions
  const dispatch = useAppDispatch();
  const handleClose = useCallback(() => {
    dispatch(LLMAssistantActions.closeLLMDialog());
  }, [dispatch]);

  const projectId = useAppSelector((state) => state.project.projectId);
  const tabNavigate = useTabNavigate();
  const handleOpenFirstDocument = () => {
    if (!projectId) return;

    const firstSdocId = jobResult.results[0].sdoc_id;

    dispatch(LLMAssistantActions.closeLLMDialog());
    tabNavigate({
      params: { projectId, sdocId: firstSdocId },
      to: "/project/$projectId/annotation/$sdocId",
      search: {
        compareWithUserId: approach2AssistantID[approachType],
        visibleUserId: undefined,
        selectedAnnotationId: undefined,
      },
    });

    // reload annotations
    queryClient.invalidateQueries({
      queryKey: [QueryKey.SDOC_SPAN_ANNOTATIONS, firstSdocId, approach2AssistantID[approachType]],
    });
  };

  return (
    <>
      <LLMUtterance p={3}>
        <Typography>
          I am done with annotating the text passages. You can now view the results in the Text Annotator. My
          suggestions for the next steps are the following:
        </Typography>
        <ul style={{ margin: 0 }}>
          <li>Open a document in the Annotator</li>
          <li>Change to the span annotation mode (Text icon)</li>
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
});
AnnotationResultStepContent.displayName = "AnnotationResultStepContent";
