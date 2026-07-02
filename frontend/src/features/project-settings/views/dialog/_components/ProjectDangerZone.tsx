import { ProjectHooks } from "@api/hooks/ProjectHooks";
import { useOpenConfirmationDialog } from "@core/notification";
import { ProjectRead } from "@models/ProjectRead";
import DeleteIcon from "@mui/icons-material/Delete";
import { LoadingButton } from "@mui/lab";
import { Box, Stack, TextField, Typography } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useState } from "react";

interface ProjectDangerZoneProps {
  project: ProjectRead;
}

export function ProjectDangerZone({ project }: ProjectDangerZoneProps) {
  // local state
  const [name, setName] = useState("");

  // confirmation dialog
  const openConfirmationDialog = useOpenConfirmationDialog();

  // handle delete
  const navigate = useNavigate();
  const { mutate: deleteProject, isPending } = ProjectHooks.useDeleteProject();
  const handleClickRemoveProject = useCallback(() => {
    if (project) {
      openConfirmationDialog({
        text: `Do you really want to delete the project "${project.title}"? This action cannot be undone and  will remove project and all of it's content including documents!`,
        type: "DELETE",
        onAccept: () => {
          navigate({ to: "/projects" });
          deleteProject(
            { projId: project.id },
            {
              onSuccess: () => navigate({ to: "/projects" }),
            },
          );
        },
      });
    }
  }, [project, openConfirmationDialog, navigate, deleteProject]);

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
