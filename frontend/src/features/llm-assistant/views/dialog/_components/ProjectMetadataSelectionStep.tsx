import { ProjectMetadataHooks, ProjectMetadataTable } from "@core/project-metadata";
import { DocType } from "@models/DocType";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { Box, Button, DialogActions, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { MRT_RowSelectionState } from "material-react-table";
import { memo, useCallback, useMemo, useState } from "react";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";
import { LLMAssistantUtterance } from "./LLMAssistantUtterance";

export const ProjectMetadataSelectionStep = memo(() => {
  // global state
  const selectedDocuments = useAppSelector((state) => state.llmAssistant.documentIds);
  const savedProjectMetadataIds = useAppSelector((state) => state.llmAssistant.projectMetadataIds);
  const dispatch = useAppDispatch();

  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>(() =>
    Object.fromEntries(savedProjectMetadataIds.map((metadataId) => [metadataId, true])),
  );

  // global server state
  const projectMetadata = ProjectMetadataHooks.useGetAllProjectMetadata();
  const filteredProjectMetadata = useMemo(() => {
    if (!projectMetadata.data) return [];
    return projectMetadata.data.filter((metadata) => metadata.doctype === DocType.TEXT && metadata.read_only === false);
  }, [projectMetadata.data]);

  const handleNext = useCallback(
    (projectMetadata: ProjectMetadataRead[]) => {
      dispatch(
        LLMAssistantActions.goToSettings({
          tagIds: [],
          projectMetadataIds: projectMetadata.map((metadata) => metadata.id),
          codeIds: [],
        }),
      );
    },
    [dispatch],
  );

  const handleBack = useCallback(() => {
    dispatch(LLMAssistantActions.previousDialogStep());
  }, [dispatch]);

  const renderBottomToolbarContent = useCallback(
    (props: { selectedProjectMetadata: ProjectMetadataRead[] }) => (
      <DialogActions sx={{ width: "100%", p: 0 }}>
        <Box flexGrow={1} />
        <Button onClick={handleBack}>Back</Button>
        <Button
          variant="contained"
          startIcon={<PlayCircleIcon />}
          disabled={props.selectedProjectMetadata.length === 0}
          onClick={() => handleNext(props.selectedProjectMetadata)}
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
        <Typography>
          You selected {selectedDocuments.length} document(s) for automatic metadata extraction. Please select all
          metadata that I should try to extract from the documents.
        </Typography>
      </LLMAssistantUtterance>
      <ProjectMetadataTable
        projectMetadata={filteredProjectMetadata}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionChange={setRowSelectionModel}
        renderBottomToolbar={renderBottomToolbarContent}
      />
    </>
  );
});
