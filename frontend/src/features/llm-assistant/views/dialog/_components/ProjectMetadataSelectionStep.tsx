import { ProjectMetadataHooks, ProjectMetadataTable } from "@core/project-metadata";
import { DocType } from "@models/DocType";
import { ProjectMetadataRead } from "@models/ProjectMetadataRead";
import { TaskType } from "@models/TaskType";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { Box, Button, DialogActions, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { MRT_RowSelectionState } from "material-react-table";
import { memo, useCallback, useMemo, useState } from "react";
import { LlmAssistantHooks } from "../../../api/llmAssistantHooks";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";
import { LLMAssistantUtterance } from "./LLMAssistantUtterance";

export const ProjectMetadataSelectionStep = memo(() => {
  // global state
  const projectId = useAppSelector((state) => state.llmAssistant.projectId);
  const selectedDocuments = useAppSelector((state) => state.llmAssistant.documentIds);
  const savedMetadata = useAppSelector((state) => state.llmAssistant.metadata);
  const dispatch = useAppDispatch();

  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>(() =>
    Object.fromEntries(savedMetadata.map((metadata) => [metadata.id, true])),
  );

  // global server state
  const projectMetadata = ProjectMetadataHooks.useGetProjectMetadataList();
  const filteredProjectMetadata = useMemo(() => {
    if (!projectMetadata.data) return [];
    return projectMetadata.data.filter((metadata) => metadata.doctype === DocType.TEXT && metadata.read_only === false);
  }, [projectMetadata.data]);

  // initiate next step (get the generated prompts)
  const { mutate: determineApproachMutation, isPending } = LlmAssistantHooks.useDetermineApproach();

  const handleNext = useCallback(
    (projectMetadata: ProjectMetadataRead[]) => {
      determineApproachMutation(
        {
          requestBody: {
            task_type: TaskType.METADATA_EXTRACTION,
            project_id: projectId,
            specific_task_parameters: {
              task_type: TaskType.METADATA_EXTRACTION,
              project_metadata_ids: projectMetadata.map((metadata) => metadata.id),
              sdoc_ids: selectedDocuments,
            },
          },
        },
        {
          onSuccess(data) {
            dispatch(
              LLMAssistantActions.goToSettings({
                approach: data,
                tags: [],
                metadata: projectMetadata,
                codes: [],
              }),
            );
          },
        },
      );
    },
    [projectId, selectedDocuments, determineApproachMutation, dispatch],
  );

  const handleBack = useCallback(() => {
    dispatch(LLMAssistantActions.previousDialogStep());
  }, [dispatch]);

  const renderBottomToolbarContent = useCallback(
    (props: { selectedProjectMetadata: ProjectMetadataRead[] }) => (
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
          disabled={props.selectedProjectMetadata.length === 0}
          onClick={() => handleNext(props.selectedProjectMetadata)}
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
