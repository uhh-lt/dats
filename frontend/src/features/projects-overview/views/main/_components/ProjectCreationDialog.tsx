import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { FormText, FormTextMultiline } from "@components/form-inputs";
import { ProjectHooks } from "@core/project";
import { ErrorMessage } from "@hookform/error-message";
import { useDialog } from "@hooks/useDialog";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { ProjectCreate } from "@models/ProjectCreate";
import SaveIcon from "@mui/icons-material/Save";
import {
  Button,
  Card,
  CardActionArea,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  Stack,
  Typography,
} from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";

export function ProjectCreationDialog() {
  // dialog state
  const { isOpen, open: handleOpen, close: handleClose } = useDialog();

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // form
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<ProjectCreate>();

  // reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      reset({ title: "", description: "" });
    }
  }, [isOpen, reset]);

  // form actions
  const navigate = useNavigate();
  const { mutate: createProjectMutation, isPending } = ProjectHooks.useCreateProject();
  const handleProjectCreation = useCallback<SubmitHandler<ProjectCreate>>(
    (data) => {
      createProjectMutation(
        {
          requestBody: {
            title: data.title,
            description: data.description,
          },
        },
        {
          onSuccess: (project) => {
            handleClose();
            navigate({
              to: "/project/$projectId/search",
              params: { projectId: project.id },
              search: { searchQuery: "" },
            });
          },
        },
      );
    },
    [createProjectMutation, handleClose, navigate],
  );
  const handleError: SubmitErrorHandler<ProjectCreate> = (data) => console.error(data);

  return (
    <>
      <Card
        sx={{
          border: "3px dashed lightgray",
          boxShadow: 0,
        }}
      >
        <CardActionArea onClick={handleOpen}>
          <CardContent
            sx={{
              height: 240,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography variant="h5" fontWeight={700} color="textSecondary" mb={5}>
              CREATE NEW PROJECT
            </Typography>
          </CardContent>
        </CardActionArea>
      </Card>
      <Dialog
        open={isOpen}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMaximized}
        component="form"
        onSubmit={handleSubmit(handleProjectCreation, handleError)}
      >
        <DATSDialogHeader
          title="Create new project"
          onClose={handleClose}
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
                helperText: <ErrorMessage errors={errors} name="title" />,
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
          <Button
            variant="contained"
            color="success"
            startIcon={<SaveIcon />}
            type="submit"
            loading={isPending}
            loadingPosition="start"
            fullWidth
          >
            Create project
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
