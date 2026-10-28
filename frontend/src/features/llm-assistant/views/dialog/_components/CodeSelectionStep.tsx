import { CodeTable } from "@core/code";
import { CodeRead } from "@models/CodeRead";
import { TaskType } from "@models/TaskType";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { Box, Button, DialogActions, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { MRT_RowSelectionState } from "material-react-table";
import { memo, useCallback, useState } from "react";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";
import { LLMAssistantUtterance } from "./LLMAssistantUtterance";

export const CodeSelectionStep = memo(() => {
  // global state
  const projectId = useAppSelector((state) => state.llmAssistant.projectId);
  const selectedDocuments = useAppSelector((state) => state.llmAssistant.documentIds);
  const taskType = useAppSelector((state) => state.llmAssistant.method);
  const savedCodeIds = useAppSelector((state) => state.llmAssistant.codeIds);
  const dispatch = useAppDispatch();

  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>(() =>
    Object.fromEntries(savedCodeIds.map((codeId) => [codeId, true])),
  );

  const handleNext = useCallback(
    (codes: CodeRead[]) => {
      dispatch(
        LLMAssistantActions.goToSettings({
          tagIds: [],
          projectMetadataIds: [],
          codeIds: codes.map((code) => code.id),
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
    (props: { selectedCodes: CodeRead[] }) => (
      <DialogActions sx={{ width: "100%", p: 0 }}>
        <Box flexGrow={1} />
        <Button onClick={handleBack}>Back</Button>
        <Button
          variant="contained"
          startIcon={<PlayCircleIcon />}
          disabled={props.selectedCodes.length === 0}
          onClick={() => handleNext(props.selectedCodes)}
        >
          Next!
        </Button>
      </DialogActions>
    ),
    [handleNext, handleBack],
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
