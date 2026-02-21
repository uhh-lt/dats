import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { LoadingButton } from "@mui/lab";
import { Box, Button, DialogActions, Typography } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { memo, useCallback, useState } from "react";
import { LLMHooks } from "../../../api/LLMHooks.ts";
import { CodeRead } from "../../../api/openapi/models/CodeRead.ts";
import { TaskType } from "../../../api/openapi/models/TaskType.ts";
import { CodeTable } from "../../../core/code/table/CodeTable.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../store/dialogSlice.ts";
import { LLMUtterance } from "./LLMUtterance.tsx";

export const CodeSelectionStep = memo(() => {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global state
  const projectId = useAppSelector((state) => state.dialog.llmProjectId);
  const selectedDocuments = useAppSelector((state) => state.dialog.llmDocumentIds);
  const llmJobType = useAppSelector((state) => state.dialog.llmMethod);
  const dispatch = useAppDispatch();

  // initiate next step (get the generated prompts)
  const { mutate: determineApproachMutation, isPending } = LLMHooks.useDetermineApproach();

  const handleNext = useCallback(
    (codes: CodeRead[]) => {
      if (!llmJobType) return;
      if (llmJobType !== TaskType.ANNOTATION && llmJobType !== TaskType.SENTENCE_ANNOTATION) {
        console.error("Invalid job type for code selection step");
        return;
      }

      const params = {
        llm_job_type: llmJobType,
        project_id: projectId,
        specific_task_parameters: {
          llm_job_type: llmJobType,
          code_ids: codes.map((code) => code.id),
          sdoc_ids: selectedDocuments,
        },
      };

      determineApproachMutation(
        { requestBody: params },
        {
          onSuccess(data) {
            dispatch(
              CRUDDialogActions.llmDialogGoToApproachSelection({
                approach: data,
                tags: [],
                metadata: [],
                codes: codes,
              }),
            );
          },
        },
      );
    },
    [llmJobType, projectId, selectedDocuments, determineApproachMutation, dispatch],
  );

  const handleBack = useCallback(() => {
    dispatch(CRUDDialogActions.previousLLMDialogStep());
  }, [dispatch]);

  // rendering
  const renderBottomToolbarContent = useCallback(
    (props: { selectedCodes: CodeRead[] }) => (
      <DialogActions sx={{ width: "100%", p: 0 }}>
        <Box flexGrow={1} />
        <Button disabled={isPending} onClick={handleBack}>
          Back
        </Button>
        <LoadingButton
          variant="contained"
          startIcon={<PlayCircleIcon />}
          loading={isPending}
          loadingPosition="start"
          disabled={props.selectedCodes.length === 0}
          onClick={() => handleNext(props.selectedCodes)}
        >
          Next!
        </LoadingButton>
      </DialogActions>
    ),
    [isPending, handleNext, handleBack],
  );

  return (
    <>
      <LLMUtterance p={3}>
        {llmJobType === TaskType.SENTENCE_ANNOTATION ? (
          <Typography>
            You selected {selectedDocuments.length} document(s) for automatic sentence annotation. Please select all
            codes that I should use to annotate sentences.
          </Typography>
        ) : (
          <Typography>
            You selected {selectedDocuments.length} document(s) for automatic annotation. Please select all codes that I
            should use to annotate text passages.
          </Typography>
        )}
      </LLMUtterance>
      <CodeTable
        projectId={projectId}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionChange={setRowSelectionModel}
        renderBottomToolbar={renderBottomToolbarContent}
      />
    </>
  );
});
