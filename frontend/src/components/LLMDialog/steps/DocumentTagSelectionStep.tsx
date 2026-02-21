import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { LoadingButton } from "@mui/lab";
import { Box, Button, DialogActions, Typography } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { memo, useCallback, useState } from "react";
import { LLMHooks } from "../../../api/LLMHooks.ts";
import { TagRead } from "../../../api/openapi/models/TagRead.ts";
import { TaskType } from "../../../api/openapi/models/TaskType.ts";
import { TagTable } from "../../../core/tag/table/TagTable.tsx";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../store/dialogSlice.ts";
import { LLMUtterance } from "./LLMUtterance.tsx";

export const DocumentTagSelectionStep = memo(() => {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global state
  const projectId = useAppSelector((state) => state.dialog.llmProjectId);
  const selectedDocuments = useAppSelector((state) => state.dialog.llmDocumentIds);
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
              CRUDDialogActions.llmDialogGoToApproachSelection({ approach: data, tags: tags, metadata: [], codes: [] }),
            );
          },
        },
      );
    },
    [determineApproachMutation, dispatch, projectId, selectedDocuments],
  );

  const handleBack = useCallback(() => {
    dispatch(CRUDDialogActions.previousLLMDialogStep());
  }, [dispatch]);

  // rendering
  const renderBottomToolbarContent = useCallback(
    (props: { selectedTags: TagRead[] }) => (
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
          disabled={props.selectedTags.length === 0}
          onClick={handleNext(props.selectedTags)}
        >
          Next!
        </LoadingButton>
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
