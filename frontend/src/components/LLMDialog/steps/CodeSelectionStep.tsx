import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { LoadingButton } from "@mui/lab";
import { Box, Button, DialogActions, DialogContent, Typography } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useState } from "react";
import LLMHooks from "../../../api/LLMHooks.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { TaskType } from "../../../api/openapi/models/TaskType.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import CodeTable from "../../Code/CodeTable.tsx";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import LLMUtterance from "./LLMUtterance.tsx";

function CodeSelectionStep() {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global state
  const projectId = useAppSelector((state) => state.dialog.llmProjectId);
  const selectedDocuments = useAppSelector((state) => state.dialog.llmDocumentIds);
  const llmJobType = useAppSelector((state) => state.dialog.llmMethod);
  const dispatch = useAppDispatch();

  // initiate next step (get the generated prompts)
  const determineApproachMutation = LLMHooks.useDetermineApproach();
  const handleNext = (codes: CodeRead[]) => () => {
    if (!llmJobType) return;
    if (llmJobType !== TaskType.ANNOTATION && llmJobType !== TaskType.SENTENCE_ANNOTATION) {
      console.error("Invalid job type for code selection step");
      return;
    }

    determineApproachMutation.mutate(
      {
        requestBody: {
          llm_job_type: llmJobType,
          project_id: projectId,
          specific_task_parameters: {
            llm_job_type: llmJobType,
            code_ids: codes.map((code) => code.id),
            sdoc_ids: selectedDocuments,
          },
        },
      },
      {
        onSuccess(data) {
          dispatch(
            CRUDDialogActions.llmDialogGoToApproachSelection({ approach: data, tags: [], metadata: [], codes: codes }),
          );
        },
      },
    );
  };

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          {llmJobType === TaskType.SENTENCE_ANNOTATION ? (
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
              disabled={determineApproachMutation.isPending}
              onClick={() => dispatch(CRUDDialogActions.previousLLMDialogStep())}
            >
              Back
            </Button>
            <LoadingButton
              variant="contained"
              startIcon={<PlayCircleIcon />}
              loading={determineApproachMutation.isPending}
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
