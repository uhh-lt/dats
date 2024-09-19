import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { LoadingButton } from "@mui/lab";
import { Box, Button, DialogActions, DialogContent, Typography } from "@mui/material";
import { MRT_RowSelectionState } from "material-react-table";
import { useMemo, useState } from "react";
import LLMHooks from "../../../api/LLMHooks.ts";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import { DocType } from "../../../api/openapi/models/DocType.ts";
import { LLMJobType } from "../../../api/openapi/models/LLMJobType.ts";
import { ProjectMetadataRead } from "../../../api/openapi/models/ProjectMetadataRead.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import ProjectMetadataTable from "../../Metadata/ProjectMetadataTable.tsx";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import LLMUtterance from "./LLMUtterance.tsx";

function ProjectMetadataSelectionStep({ projectId }: { projectId: number }) {
  // local state
  const [rowSelectionModel, setRowSelectionModel] = useState<MRT_RowSelectionState>({});

  // global state
  const selectedDocuments = useAppSelector((state) => state.dialog.llmDocumentIds);
  const dispatch = useAppDispatch();

  // global server state
  const projectMetadata = ProjectHooks.useGetMetadata(projectId);
  const filteredProjectMetadata = useMemo(() => {
    if (!projectMetadata.data) return [];
    return projectMetadata.data.filter((metadata) => metadata.doctype === DocType.TEXT && metadata.read_only === false);
  }, [projectMetadata.data]);

  // initiate next step (get the generated prompts)
  const createPromptTemplatesMutation = LLMHooks.useCreatePromptTemplates();
  const handleNext = (projectMetadata: ProjectMetadataRead[]) => () => {
    createPromptTemplatesMutation.mutate(
      {
        requestBody: {
          llm_job_type: LLMJobType.METADATA_EXTRACTION,
          project_id: projectId,
          prompts: [],
          specific_llm_job_parameters: {
            llm_job_type: LLMJobType.METADATA_EXTRACTION,
            project_metadata_ids: projectMetadata.map((metadata) => metadata.id),
            sdoc_ids: selectedDocuments,
          },
        },
      },
      {
        onSuccess(data) {
          dispatch(
            CRUDDialogActions.llmDialogGoToPromptEditor({
              prompts: data,
              tags: [],
              metadata: projectMetadata,
              codes: [],
            }),
          );
        },
      },
    );
  };

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>
            You selected {selectedDocuments.length} document(s) for automatic metadata extraction. Please select all
            metadata that I should try to extract from the documents.
          </Typography>
        </LLMUtterance>
      </DialogContent>
      <ProjectMetadataTable
        projectMetadata={filteredProjectMetadata}
        projectId={projectId}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionChange={setRowSelectionModel}
        renderBottomToolbarCustomActions={(props) => (
          <DialogActions sx={{ width: "100%", p: 0 }}>
            <Box flexGrow={1} />
            <Button
              disabled={createPromptTemplatesMutation.isPending}
              onClick={() => dispatch(CRUDDialogActions.backToMethodSelectionLLMDialogStep())}
            >
              Back
            </Button>
            <LoadingButton
              variant="contained"
              startIcon={<PlayCircleIcon />}
              loading={createPromptTemplatesMutation.isPending}
              loadingPosition="start"
              disabled={props.selectedProjectMetadata.length === 0}
              onClick={handleNext(props.selectedProjectMetadata)}
            >
              Next!
            </LoadingButton>
          </DialogActions>
        )}
      />
    </>
  );
}

export default ProjectMetadataSelectionStep;
