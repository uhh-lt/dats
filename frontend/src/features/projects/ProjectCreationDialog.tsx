import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { LoadingButton } from "@mui/lab";
import { Dialog, DialogActions, DialogContent, Stack } from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { ProjectHooks } from "../../api/ProjectHooks.ts";
import { ProjectCreate } from "../../api/openapi/models/ProjectCreate.ts";
import { FormText } from "../../components/FormInputs/FormText.tsx";
import { FormTextMultiline } from "../../components/FormInputs/FormTextMultiline.tsx";
import { DATSDialogHeader } from "../../components/MUI/DATSDialogHeader.tsx";
import { useDialogMaximize } from "../../hooks/useDialogMaximize.ts";

interface ProjectCreationDialogProps {
  open: boolean;
  onClose: () => void;
}

export function ProjectCreationDialog({ open, onClose }: ProjectCreationDialogProps) {
  // project creation
  const navigate = useNavigate();
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<ProjectCreate>({
    defaultValues: {
      title: "",
      description: "",
    },
  });
  const createProjectMutation = ProjectHooks.useCreateProject();
  const handleProjectCreation: SubmitHandler<ProjectCreate> = (data) => {
    createProjectMutation.mutate(
      {
        requestBody: {
          title: data.title,
          description: data.description,
        },
      },
      {
        onSuccess: (project) => navigate({ to: "/project/$projectId/search", params: { projectId: project.id } }),
      },
    );
  };
  const handleError: SubmitErrorHandler<ProjectCreate> = (error) => {
    console.error(error);
  };

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMaximized}
      component="form"
      onSubmit={handleSubmit(handleProjectCreation, handleError)}
    >
      <DATSDialogHeader
        title="Create new project"
        onClose={onClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      <DialogContent>
        <Stack spacing={2} pt={1}>
          <FormText
            name="title"
            control={control}
            rules={{
              required: "Project name is required",
            }}
            textFieldProps={{
              label: "Project name",
              variant: "outlined",
              fullWidth: true,
              error: Boolean(errors.title),
            }}
          />
          <FormTextMultiline
            name="description"
            control={control}
            rules={{
              required: "Project description is required",
            }}
            textFieldProps={{
              label: "Project description",
              placeholder: "Describe your project aim, method, and material used in a short abstract.",
              variant: "outlined",
              fullWidth: true,
              error: Boolean(errors.description),
              helperText: <ErrorMessage errors={errors} name="description" />,
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <LoadingButton
          variant="contained"
          color="success"
          startIcon={<SaveIcon />}
          type="submit"
          loading={createProjectMutation.isPending}
          loadingPosition="start"
          fullWidth
        >
          Create project
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
