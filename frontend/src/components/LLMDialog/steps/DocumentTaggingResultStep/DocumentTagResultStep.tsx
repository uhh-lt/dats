import LabelIcon from "@mui/icons-material/Label";
import { LoadingButton } from "@mui/lab";
import { Button, DialogActions, DialogContent, Typography } from "@mui/material";
import { useState } from "react";
import LLMHooks from "../../../../api/LLMHooks.ts";
import { DocumentTaggingLLMJobResult } from "../../../../api/openapi/models/DocumentTaggingLLMJobResult.ts";
import ProjectHooks from "../../../../api/ProjectHooks.ts";
import TagHooks from "../../../../api/TagHooks.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../dialogSlice.ts";
import LLMUtterance from "../LLMUtterance.tsx";
import { DocumentTaggingResultRow } from "./DocumentTaggingResultRow.ts";
import DocumentTagResultStepTable from "./DocumentTagResultStepTable.tsx";

function DocumentTagResultStep({ projectId }: { projectId: number }) {
  // local client state
  const [rows, setRows] = useState<DocumentTaggingResultRow[]>([]);

  // global client state
  const llmJobId = useAppSelector((state) => state.dialog.llmJobId);
  const dispatch = useAppDispatch();

  // global server state
  const documentTags = ProjectHooks.useGetAllTags(projectId);

  // get the job
  const llmJob = LLMHooks.usePollLLMJob(llmJobId, undefined);

  // actions
  const handleClose = () => {
    dispatch(CRUDDialogActions.closeLLMDialog());
  };

  const applyTagsMutation = TagHooks.useBulkSetDocumentTags();
  const handleApplyNewTags = () => {
    applyTagsMutation.mutate(
      {
        requestBody: rows.map((row) => ({
          source_document_id: row.sdocId,
          document_tag_ids: row.merged_tags.map((tag) => tag.id),
        })),
      },
      {
        onSuccess() {
          dispatch(CRUDDialogActions.closeLLMDialog());
        },
      },
    );
  };

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>
            Here are the results! You can find my suggestions in the column <i>Suggested Tags</i>. Now, you decide what
            to do with them:
          </Typography>
          <ul style={{ margin: 0 }}>
            <li>Use your current tags (discarding my suggestions)</li>
            <li>Use my suggested tags (discarding the current tags)</li>
            <li>Merge both your current tags and my suggested tags</li>
          </ul>
        </LLMUtterance>
      </DialogContent>
      {documentTags.isSuccess && llmJob.isSuccess && (
        <DocumentTagResultStepTable
          rows={rows}
          onUpdateRows={setRows}
          data={(llmJob.data.result?.specific_llm_job_result as DocumentTaggingLLMJobResult).results || []}
          projectTags={documentTags.data}
        />
      )}
      <DialogActions>
        <Button onClick={handleClose}>Discard results & close</Button>
        <LoadingButton
          variant="contained"
          startIcon={<LabelIcon />}
          onClick={handleApplyNewTags}
          loading={applyTagsMutation.isPending}
          loadingPosition="start"
        >
          Apply new tags
        </LoadingButton>
      </DialogActions>
    </>
  );
}

export default DocumentTagResultStep;
