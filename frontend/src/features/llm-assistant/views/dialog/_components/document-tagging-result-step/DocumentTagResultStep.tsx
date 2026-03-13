import { LLMHooks } from "@api/hooks/LLMHooks";
import { TagHooks } from "@api/hooks/TagHooks";
import { TaggingLLMJobResult } from "@api/models/TaggingLLMJobResult";
import { TagRead } from "@api/models/TagRead";
import { Button, CircularProgress, DialogActions, DialogContent, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { getIconComponent, Icon } from "@utils/icons/iconUtils";
import { memo, useCallback, useState } from "react";
import { LLMAssistantActions } from "../../../../store/llmAssistantSlice";
import { LLMUtterance } from "../LLMUtterance";
import { DocumentTaggingResultRow } from "./DocumentTaggingResultRow";
import { DocumentTagResultStepTable } from "./DocumentTagResultStepTable";

export const DocumentTagResultStep = memo(() => {
  // global client state
  const llmJobId = useAppSelector((state) => state.llmAssistant.llmJobId);
  // global server state
  const documentTags = TagHooks.useGetAllTags();
  const llmJob = LLMHooks.usePollLLMJob(llmJobId, undefined);

  if (llmJob.isSuccess && llmJob.data.output && documentTags.isSuccess) {
    return (
      <DocumentTagResultStepContent
        jobResult={llmJob.data.output.specific_task_result as TaggingLLMJobResult}
        tags={documentTags.data}
      />
    );
  } else if (llmJob.isLoading || documentTags.isLoading) {
    return (
      <DialogContent>
        <CircularProgress />
      </DialogContent>
    );
  } else if (llmJob.isError) {
    return <DialogContent>{llmJob.error.message}</DialogContent>;
  } else if (documentTags.isError) {
    return <DialogContent>{documentTags.error.message}</DialogContent>;
  } else {
    return <></>;
  }
});

function DocumentTagResultStepContent({ jobResult, tags }: { jobResult: TaggingLLMJobResult; tags: TagRead[] }) {
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
    dispatch(LLMAssistantActions.closeLLMDialog());
  }, [dispatch]);

  const { mutate: applyTagsMutation, isPending } = TagHooks.useBulkSetTags();
  const handleApplyNewTags = useCallback(() => {
    applyTagsMutation(
      {
        requestBody: rows.map((row) => ({
          source_document_id: row.sdocId,
          tag_ids: row.merged_tags.map((tag) => tag.id),
        })),
      },
      {
        onSuccess() {
          dispatch(LLMAssistantActions.closeLLMDialog());
        },
      },
    );
  }, [rows, applyTagsMutation, dispatch]);

  return (
    <>
      <LLMUtterance p={3}>
        <Typography>
          Here are the results! You can find my suggestions in the column <i>Suggested Tags</i>. Now, you decide what to
          do with them:
        </Typography>
        <ul style={{ margin: 0 }}>
          <li>Use your current tags (discarding my suggestions)</li>
          <li>Use my suggested tags (discarding the current tags)</li>
          <li>Merge both your current tags and my suggested tags</li>
        </ul>
      </LLMUtterance>
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
