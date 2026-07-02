import { LLMHooks } from "@api/hooks/LLMHooks";
import { TagTable } from "@core/tag";
import { TagRead } from "@models/TagRead";
import { TaskType } from "@models/TaskType";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { Box, Button, DialogActions, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { MRT_RowSelectionState } from "material-react-table";
import { memo, useCallback, useState } from "react";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";
import { LLMUtterance } from "./LLMUtterance";

export const DocumentTagSelectionStep = memo(() => {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global state
  const projectId = useAppSelector((state) => state.llmAssistant.llmProjectId);
  const selectedDocuments = useAppSelector((state) => state.llmAssistant.llmDocumentIds);
  const dispatch = useAppDispatch();

  // initiate next step (get the generated prompts)
  const { mutate: determineApproachMutation, isPending } = LLMHooks.useDetermineApproach();

  const handleNext = useCallback(
    (tags: TagRead[]) => () => {
      determineApproachMutation(
        {
          requestBody: {
            llm_job_type: TaskType.TAGGING,
            project_id: projectId,
            specific_task_parameters: {
              llm_job_type: TaskType.TAGGING,
              tag_ids: tags.map((tag) => tag.id),
              sdoc_ids: selectedDocuments,
            },
          },
        },
        {
          onSuccess(data) {
            dispatch(
              LLMAssistantActions.llmDialogGoToApproachSelection({
                approach: data,
                tags: tags,
                metadata: [],
                codes: [],
              }),
            );
          },
        },
      );
    },
    [determineApproachMutation, dispatch, projectId, selectedDocuments],
  );

  const handleBack = useCallback(() => {
    dispatch(LLMAssistantActions.previousLLMDialogStep());
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
      <LLMUtterance p={3}>
        <Typography>
          You selected {selectedDocuments.length} document(s) for automatic document tagging. Please select all tags
          that I should use to classify the documents.
        </Typography>
      </LLMUtterance>
      <TagTable
        projectId={projectId}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionChange={setRowSelectionModel}
        renderBottomToolbar={renderBottomToolbarContent}
      />
    </>
  );
});
