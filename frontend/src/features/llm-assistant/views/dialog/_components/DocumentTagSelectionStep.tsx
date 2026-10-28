import { TagTable } from "@core/tag";
import { TagRead } from "@models/TagRead";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { Box, Button, DialogActions, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { MRT_RowSelectionState } from "material-react-table";
import { memo, useCallback, useState } from "react";
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

  const handleNext = useCallback(
    (tags: TagRead[]) => () => {
      dispatch(
        LLMAssistantActions.goToSettings({
          tagIds: tags.map((tag) => tag.id),
          projectMetadataIds: [],
          codeIds: [],
        }),
      );
    },
    [dispatch],
  );

  const handleBack = useCallback(() => {
    dispatch(LLMAssistantActions.previousDialogStep());
  }, [dispatch]);

  // rendering
  const renderBottomToolbarContent = useCallback(
    (props: { selectedTags: TagRead[] }) => (
      <DialogActions sx={{ width: "100%", p: 0 }}>
        <Box flexGrow={1} />
        <Button onClick={handleBack}>Back</Button>
        <Button
          variant="contained"
          startIcon={<PlayCircleIcon />}
          disabled={props.selectedTags.length === 0}
          onClick={handleNext(props.selectedTags)}
        >
          Next!
        </Button>
      </DialogActions>
    ),
    [handleBack, handleNext],
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
