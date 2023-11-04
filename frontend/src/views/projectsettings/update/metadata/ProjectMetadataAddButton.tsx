import { Add } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { Grid } from "@mui/material";
import { useCallback } from "react";
import ProjectMetadataHooks from "../../../../api/ProjectMetadataHooks";
import { DocType, MetaType } from "../../../../api/openapi";
import SnackbarAPI from "../../../../features/Snackbar/SnackbarAPI";

interface ProjectMetadataAddButtonProps {
  projectId: number;
  key: string;
  docType: DocType;
  metaType: MetaType;
}

function ProjectMetadataAddButton({ projectId, key, docType, metaType }: ProjectMetadataAddButtonProps) {
  // mutations
  const createMutation = ProjectMetadataHooks.useCreateMetadata();

  const handleAddMetadata = useCallback(() => {
    const mutation = createMutation.mutate;
    mutation(
      {
        requestBody: {
          project_id: projectId,
          read_only: false,
          key: key,
          doctype: docType,
          metatype: metaType,
        },
      },
      {
        onSuccess: (data) => {
          SnackbarAPI.openSnackbar({
            text: `Added metadata to Project ${data.project_id}`,
            severity: "success",
          });
        },
        onError: (error: any) => {
          SnackbarAPI.openSnackbar({
            text: error.status === 409 ? "Key already exists" : "Could not add metadata",
            severity: "error",
          });
        },
      },
    );
  }, [createMutation.mutate, projectId, key, docType, metaType]);

  return (
    <Grid item md={2}>
      <LoadingButton
        sx={{ px: 1, justifyContent: "start" }}
        loading={createMutation.isLoading}
        loadingPosition="start"
        startIcon={<Add />}
        variant="outlined"
        fullWidth
        onClick={handleAddMetadata}
      >
        Add
      </LoadingButton>
    </Grid>
  );
}
export default ProjectMetadataAddButton;
