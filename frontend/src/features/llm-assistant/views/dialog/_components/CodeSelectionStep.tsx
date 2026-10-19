import { CodeTable } from "@core/code";
import { CodeRead } from "@models/CodeRead";
import { TaskType } from "@models/TaskType";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { Box, Button, DialogActions, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { MRT_RowSelectionState } from "material-react-table";
import { memo, useCallback, useState } from "react";
import { LlmAssistantHooks } from "../../../api/llmAssistantHooks";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";
import { LLMAssistantUtterance } from "./LLMAssistantUtterance";

export const CodeSelectionStep = memo(() => {
  // global state
  const projectId = useAppSelector((state) => state.llmAssistant.projectId);
  const selectedDocuments = useAppSelector((state) => state.llmAssistant.documentIds);
  const taskType = useAppSelector((state) => state.llmAssistant.method);
  const savedCodes = useAppSelector((state) => state.llmAssistant.codes);
  const dispatch = useAppDispatch();

  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>(() =>
    Object.fromEntries(savedCodes.map((code) => [code.id, true])),
  );

  // initiate next step (get the generated prompts)
  const { mutate: determineApproachMutation, isPending } = LlmAssistantHooks.useDetermineApproach();

  const handleNext = useCallback(
    (codes: CodeRead[]) => {
      if (!taskType) return;
      if (taskType !== TaskType.ANNOTATION && taskType !== TaskType.SENTENCE_ANNOTATION) {
        console.error("Invalid job type for code selection step");
        return;
      }

      const params = {
        task_type: taskType,
        project_id: projectId,
        specific_task_parameters: {
          task_type: taskType,
          code_ids: codes.map((code) => code.id),
          sdoc_ids: selectedDocuments,
        },
      };

      determineApproachMutation(
        { requestBody: params },
        {
          onSuccess(data) {
            dispatch(
              LLMAssistantActions.goToSettings({
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
    [taskType, projectId, selectedDocuments, determineApproachMutation, dispatch],
  );

  const handleBack = useCallback(() => {
    dispatch(LLMAssistantActions.previousDialogStep());
  }, [dispatch]);

  // rendering
  const renderBottomToolbarContent = useCallback(
    (props: { selectedCodes: CodeRead[] }) => (
      <DialogActions sx={{ width: "100%", p: 0 }}>
        <Box flexGrow={1} />
        <Button disabled={isPending} onClick={handleBack}>
          Back
        </Button>
        <Button
          variant="contained"
          startIcon={<PlayCircleIcon />}
          loading={isPending}
          loadingPosition="start"
          disabled={props.selectedCodes.length === 0}
          onClick={() => handleNext(props.selectedCodes)}
        >
          Next!
        </Button>
      </DialogActions>
    ),
    [isPending, handleNext, handleBack],
  );

  return (
    <>
      <LLMAssistantUtterance p={3}>
        {taskType === TaskType.SENTENCE_ANNOTATION ? (
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
      </LLMAssistantUtterance>
      <CodeTable
        projectId={projectId}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionChange={setRowSelectionModel}
        renderBottomToolbar={renderBottomToolbarContent}
      />
    </>
  );
});
