import { Add } from "@mui/icons-material";
import { LoadingButton } from "@mui/lab";
import { Grid } from "@mui/material";
import { useCallback } from "react";
import ProjectMetadataHooks from "../../../../api/ProjectMetadataHooks.ts";
import { DocType } from "../../../../api/openapi/models/DocType.ts";
import { MetaType } from "../../../../api/openapi/models/MetaType.ts";

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
    mutation({
      requestBody: {
        project_id: projectId,
        read_only: false,
        key: key,
        doctype: docType,
        metatype: metaType,
      },
    });
  }, [createMutation.mutate, projectId, key, docType, metaType]);

  return (
    <Grid item md={2}>
      <LoadingButton
        sx={{ px: 1, justifyContent: "start" }}
        loading={createMutation.isPending}
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
