import { TagTable } from "@core/tag";
import { TagRead } from "@models/TagRead";
import { TaskType } from "@models/TaskType";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { Box, Button, DialogActions, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { MRT_RowSelectionState } from "material-react-table";
import { memo, useCallback, useState } from "react";
import { LlmAssistantHooks } from "../../../api/llmAssistantHooks";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";
import { LLMAssistantUtterance } from "./LLMAssistantUtterance";

export const DocumentTagSelectionStep = memo(() => {
  // global state
  const projectId = useAppSelector((state) => state.llmAssistant.projectId);
  const selectedDocuments = useAppSelector((state) => state.llmAssistant.documentIds);
  const savedTagIds = useAppSelector((state) => state.llmAssistant.tagIds);
  const dispatch = useAppDispatch();

  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>(() =>
    Object.fromEntries(savedTagIds.map((tagId) => [tagId, true])),
  );

  // initiate next step (get the generated prompts)
  const { mutate: determineApproachMutation, isPending } = LlmAssistantHooks.useDetermineApproach();

  const handleNext = useCallback(
    (tags: TagRead[]) => () => {
      const tagIds = tags.map((tag) => tag.id);
      determineApproachMutation(
        {
          requestBody: {
            task_type: TaskType.TAGGING,
            project_id: projectId,
            specific_task_parameters: {
              task_type: TaskType.TAGGING,
              tag_ids: tagIds,
              sdoc_ids: selectedDocuments,
            },
          },
        },
        {
          onSuccess(data) {
            dispatch(
              LLMAssistantActions.goToSettings({
                approach: data,
                tagIds,
                projectMetadataIds: [],
                codeIds: [],
              }),
            );
          },
        },
      );
    },
    [determineApproachMutation, dispatch, projectId, selectedDocuments],
  );

  const handleBack = useCallback(() => {
    dispatch(LLMAssistantActions.previousDialogStep());
  }, [dispatch]);

  // rendering
  const renderBottomToolbarContent = useCallback(
    (props: { selectedTags: TagRead[] }) => (
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
          disabled={props.selectedTags.length === 0}
          onClick={handleNext(props.selectedTags)}
        >
          Next!
        </Button>
      </DialogActions>
    ),
    [isPending, handleBack, handleNext],
  );

  return (
    <>
      <LLMAssistantUtterance p={3}>
        <Typography>
          You selected {selectedDocuments.length} document(s) for automatic document tagging. Please select all tags
          that I should use to classify the documents.
        </Typography>
      </LLMAssistantUtterance>
      <TagTable
        projectId={projectId}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionChange={setRowSelectionModel}
        renderBottomToolbar={renderBottomToolbarContent}
      />
    </>
  );
});
