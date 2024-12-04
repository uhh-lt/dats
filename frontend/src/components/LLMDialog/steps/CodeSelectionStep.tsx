import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { LoadingButton } from "@mui/lab";
import { Box, Button, DialogActions, DialogContent, Typography } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useState } from "react";
import LLMHooks from "../../../api/LLMHooks.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { LLMJobType } from "../../../api/openapi/models/LLMJobType.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import CodeTable from "../../Code/CodeTable.tsx";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import LLMUtterance from "./LLMUtterance.tsx";

function CodeSelectionStep({ projectId, isSentenceAnnotation }: { projectId: number; isSentenceAnnotation: boolean }) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global state
  const selectedDocuments = useAppSelector((state) => state.dialog.llmDocumentIds);
  const dispatch = useAppDispatch();

  // initiate next step (get the generated prompts)
  const createPromptTemplatesMutation = LLMHooks.useCreatePromptTemplates();
  const handleNext = (codes: CodeRead[]) => () => {
    if (isSentenceAnnotation) {
      createPromptTemplatesMutation.mutate(
        {
          requestBody: {
            llm_job_type: LLMJobType.SENTENCE_ANNOTATION,
            project_id: projectId,
            prompts: [],
            specific_llm_job_parameters: {
              llm_job_type: LLMJobType.SENTENCE_ANNOTATION,
              code_ids: codes.map((code) => code.id),
              sdoc_ids: selectedDocuments,
            },
          },
        },
        {
          onSuccess(data) {
            dispatch(
              CRUDDialogActions.llmDialogGoToPromptEditor({ prompts: data, tags: [], metadata: [], codes: codes }),
            );
          },
        },
      );
    } else {
      createPromptTemplatesMutation.mutate(
        {
          requestBody: {
            llm_job_type: LLMJobType.ANNOTATION,
            project_id: projectId,
            prompts: [],
            specific_llm_job_parameters: {
              llm_job_type: LLMJobType.ANNOTATION,
              code_ids: codes.map((code) => code.id),
              sdoc_ids: selectedDocuments,
            },
          },
        },
        {
          onSuccess(data) {
            dispatch(
              CRUDDialogActions.llmDialogGoToPromptEditor({ prompts: data, tags: [], metadata: [], codes: codes }),
            );
          },
        },
      );
    }
  };

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          {isSentenceAnnotation ? (
            <Typography>
              You selected {selectedDocuments.length} document(s) for automatic sentence annotation. Please select all
              codes that I should use to annotate sentences.
            </Typography>
          ) : (
            <Typography>
              You selected {selectedDocuments.length} document(s) for automatic annotation. Please select all codes that
              I should use to annotate text passages.
            </Typography>
          )}
        </LLMUtterance>
      </DialogContent>
      <CodeTable
        projectId={projectId}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionChange={setRowSelectionModel}
        renderBottomToolbarCustomActions={(props) => (
          <DialogActions sx={{ width: "100%", p: 0 }}>
            <Box flexGrow={1} />
            <Button
              disabled={createPromptTemplatesMutation.isPending}
              onClick={() => dispatch(CRUDDialogActions.previousLLMDialogStep())}
            >
              Back
            </Button>
            <LoadingButton
              variant="contained"
              startIcon={<PlayCircleIcon />}
              loading={createPromptTemplatesMutation.isPending}
              loadingPosition="start"
              disabled={props.selectedCodes.length === 0}
              onClick={handleNext(props.selectedCodes)}
            >
              Next!
            </LoadingButton>
          </DialogActions>
        )}
      />
    </>
  );
}

export default CodeSelectionStep;
