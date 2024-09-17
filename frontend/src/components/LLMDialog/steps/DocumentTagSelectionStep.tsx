import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { LoadingButton } from "@mui/lab";
import { Box, Button, DialogActions, DialogContent, Typography } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useState } from "react";
import LLMHooks from "../../../api/LLMHooks.ts";
import { DocumentTagRead } from "../../../api/openapi/models/DocumentTagRead.ts";
import { LLMJobType } from "../../../api/openapi/models/LLMJobType.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import TagTable from "../../Tag/TagTable.tsx";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import LLMUtterance from "./LLMUtterance.tsx";

function DocumentTagSelectionStep({ projectId }: { projectId: number }) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global state
  const selectedDocuments = useAppSelector((state) => state.dialog.llmDocumentIds);
  const dispatch = useAppDispatch();

  // initiate next step (get the generated prompts)
  const createPromptTemplatesMutation = LLMHooks.useCreatePromptTemplates();
  const handleNext = (tags: DocumentTagRead[]) => () => {
    createPromptTemplatesMutation.mutate(
      {
        requestBody: {
          llm_job_type: LLMJobType.DOCUMENT_TAGGING,
          project_id: projectId,
          prompts: [],
          specific_llm_job_parameters: {
            llm_job_type: LLMJobType.DOCUMENT_TAGGING,
            tag_ids: tags.map((tag) => tag.id),
            sdoc_ids: selectedDocuments,
          },
        },
      },
      {
        onSuccess(data) {
          dispatch(CRUDDialogActions.llmDialogGoToPromptEditor({ prompts: data, tags: tags }));
        },
      },
    );
  };

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>
            You selected {selectedDocuments.length} document(s) for automatic document tagging. Please select all tags
            that I should use to classify the documents.
          </Typography>
        </LLMUtterance>
      </DialogContent>
      <TagTable
        projectId={projectId}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionChange={setRowSelectionModel}
        renderBottomToolbarCustomActions={(props) => (
          <DialogActions sx={{ width: "100%", p: 0 }}>
            <Box flexGrow={1} />
            <Button
              disabled={createPromptTemplatesMutation.isPending}
              onClick={() => dispatch(CRUDDialogActions.backToMethodSelectionLLMDialogStep())}
            >
              Back
            </Button>
            <LoadingButton
              variant="contained"
              startIcon={<PlayCircleIcon />}
              loading={createPromptTemplatesMutation.isPending}
              loadingPosition="start"
              disabled={props.selectedTags.length === 0}
              onClick={handleNext(props.selectedTags)}
            >
              Next!
            </LoadingButton>
          </DialogActions>
        )}
      />
    </>
  );
}

export default DocumentTagSelectionStep;
