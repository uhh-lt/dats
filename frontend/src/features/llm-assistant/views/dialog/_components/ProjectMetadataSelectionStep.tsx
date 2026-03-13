import { LLMHooks } from "@api/hooks/LLMHooks";
import { MetadataHooks } from "@api/hooks/MetadataHooks";
import { DocType } from "@api/models/DocType";
import { ProjectMetadataRead } from "@api/models/ProjectMetadataRead";
import { TaskType } from "@api/models/TaskType";
import { ProjectMetadataTable } from "@core/project-metadata";
import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { Box, Button, DialogActions, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { MRT_RowSelectionState } from "material-react-table";
import { memo, useCallback, useMemo, useState } from "react";
import { LLMAssistantActions } from "../../../store/llmAssistantSlice";
import { LLMUtterance } from "./LLMUtterance";

export const ProjectMetadataSelectionStep = memo(() => {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global state
  const projectId = useAppSelector((state) => state.llmAssistant.llmProjectId);
  const selectedDocuments = useAppSelector((state) => state.llmAssistant.llmDocumentIds);
  const dispatch = useAppDispatch();

  // global server state
  const projectMetadata = MetadataHooks.useGetProjectMetadataList();
  const filteredProjectMetadata = useMemo(() => {
    if (!projectMetadata.data) return [];
    return projectMetadata.data.filter((metadata) => metadata.doctype === DocType.TEXT && metadata.read_only === false);
  }, [projectMetadata.data]);

  // initiate next step (get the generated prompts)
  const { mutate: determineApproachMutation, isPending } = LLMHooks.useDetermineApproach();

  const handleNext = useCallback(
    (projectMetadata: ProjectMetadataRead[]) => {
      determineApproachMutation(
        {
          requestBody: {
            llm_job_type: TaskType.METADATA_EXTRACTION,
            project_id: projectId,
            specific_task_parameters: {
              llm_job_type: TaskType.METADATA_EXTRACTION,
              project_metadata_ids: projectMetadata.map((metadata) => metadata.id),
              sdoc_ids: selectedDocuments,
            },
          },
        },
        {
          onSuccess(data) {
            dispatch(
              LLMAssistantActions.llmDialogGoToApproachSelection({
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
    dispatch(LLMAssistantActions.previousLLMDialogStep());
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
      <LLMUtterance p={3}>
        <Typography>
          You selected {selectedDocuments.length} document(s) for automatic metadata extraction. Please select all
          metadata that I should try to extract from the documents.
        </Typography>
      </LLMUtterance>
      <ProjectMetadataTable
        projectMetadata={filteredProjectMetadata}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionChange={setRowSelectionModel}
        renderBottomToolbar={renderBottomToolbarContent}
      />
    </>
  );
});
