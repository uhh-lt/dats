import DeleteIcon from "@mui/icons-material/Delete";
import { LoadingButton } from "@mui/lab";
import { Box, Stack, TextField, Typography } from "@mui/material";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ProjectRead } from "../../../api/openapi/models/ProjectRead.ts";
import ProjectHooks from "../../../api/ProjectHooks.ts";
import ConfirmationAPI from "../../ConfirmationDialog/ConfirmationAPI.ts";

interface ProjectDangerZoneProps {
  project: ProjectRead;
}

function ProjectDangerZone({ project }: ProjectDangerZoneProps) {
  const { mutate: deleteProject, isPending } = ProjectHooks.useDeleteProject();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const handleClickRemoveProject = useCallback(() => {
    if (project) {
      ConfirmationAPI.openConfirmationDialog({
        text: `Do you really want to delete the project "${project.title}"? This action cannot be undone and  will remove project and all of it's content including documents!`,
        type: "DELETE",
        onAccept: () => {
          navigate(`/projects`);
          deleteProject(
            { projId: project.id },
            {
              onSuccess: () => navigate(`/projects`),
            },
          );
        },
      });
    }
  }, [project, deleteProject, navigate]);

  return (
    <Box margin={2}>
      <Stack direction="column" spacing={2} sx={{ width: "100%", alignItems: "left" }}>
        <Typography variant="h6" component="div" flexShrink={0}>
          Delete this entire project including all documents, annotations for you and every other person working on this
          project. This cannot be undone!
        </Typography>
        <Stack direction="row" spacing={2} sx={{ width: "100%", alignItems: "left" }}>
          <TextField
            value={name}
            fullWidth
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setName(event.target.value);
            }}
            helperText="Enter the name of the project if you really want to delete the project"
            error={name != project.title}
            onPaste={(e) => {
              e.preventDefault();
            }}
          />
          <LoadingButton
            variant="contained"
            color="error"
            startIcon={<DeleteIcon />}
            type="submit"
            onClick={handleClickRemoveProject}
            disabled={name != project.title}
            loading={isPending}
            loadingPosition="start"
          >
            Delete Project
          </LoadingButton>
        </Stack>
      </Stack>
    </Box>
  );
}

export default ProjectDangerZone;
