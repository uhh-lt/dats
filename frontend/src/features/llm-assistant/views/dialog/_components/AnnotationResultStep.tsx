import { useLiveJob } from "@core/job";
import { useTabNavigate } from "@core/navigation";
import { AnnotationLLMAssistantJobResult } from "@models/AnnotationLLMAssistantJobResult";
import { ApproachType } from "@models/ApproachType";
import { Button, CircularProgress, DialogActions, DialogContent, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { ASSISTANT_FEWSHOT_ID, ASSISTANT_ZEROSHOT_ID } from "@utils/GlobalConstants";
import { memo, useCallback, useMemo } from "react";
import { llmAssistantQueries } from "../../../api/llmAssistantQueries";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";
import { AnnotationResultSummary } from "./AnnotationResultSummary";
import { LLMAssistantUtterance } from "./LLMAssistantUtterance";

const approach2AssistantID: Record<ApproachType, number> = {
  [ApproachType.LLM_ZERO_SHOT]: ASSISTANT_ZEROSHOT_ID,
  [ApproachType.LLM_FEW_SHOT]: ASSISTANT_FEWSHOT_ID,
};

export const AnnotationResultStep = memo(() => {
  // get the job
  const jobId = useAppSelector((state) => state.llmAssistant.jobId);
  const llmAssistantJob = useLiveJob(llmAssistantQueries.job.byId(jobId));

  if (llmAssistantJob.isSuccess && llmAssistantJob.data.output) {
    return (
      <AnnotationResultStepContent
        jobResult={llmAssistantJob.data.output.specific_task_result as AnnotationLLMAssistantJobResult}
        approachType={llmAssistantJob.data.input.approach_type}
      />
    );
  } else if (llmAssistantJob.isLoading) {
    return (
      <DialogContent>
        <CircularProgress />
      </DialogContent>
    );
  } else if (llmAssistantJob.isError) {
    return <DialogContent>{llmAssistantJob.error.message}</DialogContent>;
  } else {
    return <></>;
  }
});

interface AnnotationResultStepContentProps {
  jobResult: AnnotationLLMAssistantJobResult;
  approachType: ApproachType;
}

const AnnotationResultStepContent = memo(({ jobResult, approachType }: AnnotationResultStepContentProps) => {
  // actions
  const dispatch = useAppDispatch();
  const handleClose = useCallback(() => {
    dispatch(LLMAssistantActions.closeDialog());
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

    dispatch(LLMAssistantActions.closeDialog());
    tabNavigate({
      params: { projectId, sdocId: firstAnnotatedSdocId },
      to: "/project/$projectId/annotation/$sdocId",
      search: {
        compareWithUserId: approach2AssistantID[approachType],
        visibleUserId: undefined,
        selectedAnnotationId: undefined,
      },
    });
  };

  return (
    <>
      <LLMAssistantUtterance p={3}>
        <AnnotationResultSummary results={jobResult.results} annotationWording="span" />
        {firstAnnotatedSdocId !== undefined && (
          <>
            <Typography mt={1}>
              You can now view the results in the Text Annotator. My suggestions for the next steps are the following:
            </Typography>
            <ul style={{ margin: 0 }}>
              <li>Open a document in the Annotator</li>
              <li>Change to the span annotation mode (Text icon)</li>
              <li>Use the "Compare with" feature to compare your annotations with mine</li>
              <li>Apply correct & validated annotations to your document, so that I can learn from your feedback</li>
            </ul>
            <Typography mt={0.5}>You should look through all documents I annotated.</Typography>
          </>
        )}
      </LLMAssistantUtterance>
      <DialogActions>
        <Button onClick={handleClose}>Close dialog</Button>
        <Button variant="contained" onClick={handleOpenFirstDocument} disabled={firstAnnotatedSdocId === undefined}>
          Open first document
        </Button>
      </DialogActions>
    </>
  );
});
AnnotationResultStepContent.displayName = "AnnotationResultStepContent";
