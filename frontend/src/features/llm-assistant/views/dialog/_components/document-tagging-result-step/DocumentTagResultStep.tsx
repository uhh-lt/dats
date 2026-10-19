import { useLiveJob } from "@core/job";
import { getIconComponent, Icon } from "@components/icons";
import { TagHooks } from "@core/tag";
import { TaggingLLMAssistantJobResult } from "@models/TaggingLLMAssistantJobResult";
import { TagRead } from "@models/TagRead";
import { Button, CircularProgress, DialogActions, DialogContent, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { memo, useCallback, useState } from "react";
import { llmAssistantQueries } from "../../../../api/llmAssistantQueries";
import { LLMAssistantActions } from "../../../../store/llmAssistantSlice";
import { LLMAssistantUtterance } from "../LLMAssistantUtterance";
import { DocumentTaggingResultRow } from "./DocumentTaggingResultRow";
import { DocumentTagResultStepTable } from "./DocumentTagResultStepTable";

export const DocumentTagResultStep = memo(() => {
  // global client state
  const jobId = useAppSelector((state) => state.llmAssistant.jobId);
  // global server state
  const documentTags = TagHooks.useGetAllTags();
  const llmAssistantJob = useLiveJob(llmAssistantQueries.job.byId(jobId));

  if (llmAssistantJob.isSuccess && llmAssistantJob.data.output && documentTags.isSuccess) {
    return (
      <DocumentTagResultStepContent
        jobResult={llmAssistantJob.data.output.specific_task_result as TaggingLLMAssistantJobResult}
        tags={documentTags.data}
      />
    );
  } else if (llmAssistantJob.isLoading || documentTags.isLoading) {
    return (
      <DialogContent>
        <CircularProgress />
      </DialogContent>
    );
  } else if (llmAssistantJob.isError) {
    return <DialogContent>{llmAssistantJob.error.message}</DialogContent>;
  } else if (documentTags.isError) {
    return <DialogContent>{documentTags.error.message}</DialogContent>;
  } else {
    return <></>;
  }
});

function DocumentTagResultStepContent({
  jobResult,
  tags,
}: {
  jobResult: TaggingLLMAssistantJobResult;
  tags: TagRead[];
}) {
  // local client state
  const [rows, setRows] = useState<DocumentTaggingResultRow[]>(() => {
    const tagId2Tag = tags.reduce(
      (acc, tag) => {
        acc[tag.id] = tag;
        return acc;
      },
      {} as Record<number, TagRead>,
    );
    return jobResult.results.map((result) => {
      return {
        sdocId: result.sdoc_id,
        current_tags: result.current_tag_ids.map((tagId) => tagId2Tag[tagId]),
        suggested_tags: result.suggested_tag_ids.map((tagId) => tagId2Tag[tagId]),
        merged_tags: [...new Set([...result.current_tag_ids, ...result.suggested_tag_ids])].map(
          (tagId) => tagId2Tag[tagId],
        ),
        reasoning: result.reasoning,
      };
    });
  });

  const dispatch = useAppDispatch();

  // actions
  const handleClose = useCallback(() => {
    dispatch(LLMAssistantActions.closeDialog());
  }, [dispatch]);

  const { mutate: applyTagsMutation, isPending } = TagHooks.useBulkSetTags();
  const handleApplyNewTags = useCallback(() => {
    applyTagsMutation(
      {
        requestBody: {
          links: Object.fromEntries(rows.map((row) => [row.sdocId, row.merged_tags.map((tag) => tag.id)])),
        },
      },
      {
        onSuccess() {
          dispatch(LLMAssistantActions.closeDialog());
        },
      },
    );
  }, [rows, applyTagsMutation, dispatch]);

  return (
    <>
      <LLMAssistantUtterance p={3}>
        <Typography>
          Here are the results! You can find my suggestions in the column <i>Suggested Tags</i>. Now, you decide what to
          do with them:
        </Typography>
        <ul style={{ margin: 0 }}>
          <li>Use your current tags (discarding my suggestions)</li>
          <li>Use my suggested tags (discarding the current tags)</li>
          <li>Merge both your current tags and my suggested tags</li>
        </ul>
      </LLMAssistantUtterance>
      <DocumentTagResultStepTable rows={rows} onUpdateRows={setRows} />
      <DialogActions>
        <Button onClick={handleClose}>Discard results & close</Button>
        <Button
          variant="contained"
          startIcon={getIconComponent(Icon.TAG)}
          onClick={handleApplyNewTags}
          loading={isPending}
          loadingPosition="start"
        >
          Apply new tags
        </Button>
      </DialogActions>
    </>
  );
}
