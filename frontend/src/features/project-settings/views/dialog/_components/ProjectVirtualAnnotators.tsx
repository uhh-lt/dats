import { EditableTypography } from "@components/EditableTypography";
import { FormText } from "@components/form-inputs";
import { getIconComponent, Icon } from "@components/icons";
import { useOpenConfirmationDialog } from "@core/notification";
import { UserHooks } from "@core/user";
import { ProjectRead } from "@models/ProjectRead";
import { UserRead } from "@models/UserRead";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  Box,
  Button,
  CardContent,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { memo, useCallback } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";

interface VirtualAnnotatorCreateFormValues {
  name: string;
}

interface ProjectVirtualAnnotatorsProps {
  project: ProjectRead;
}

/**
 * Lists the virtual annotators of the project: users without login that own annotations, e.g. of LLM Assistant runs.
 * They can be created, renamed and deleted (together with all their annotations).
 */
export const ProjectVirtualAnnotators = memo(({ project }: ProjectVirtualAnnotatorsProps) => {
  const virtualAnnotators = UserHooks.useGetVirtualAnnotators();

  // create
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<VirtualAnnotatorCreateFormValues>({ defaultValues: { name: "" } });
  const { mutate: createVirtualAnnotatorMutation, isPending } = UserHooks.useCreateVirtualAnnotator();
  const handleVirtualAnnotatorCreation = useCallback<SubmitHandler<VirtualAnnotatorCreateFormValues>>(
    (data) => {
      createVirtualAnnotatorMutation(
        { projectId: project.id, requestBody: { name: data.name.trim() } },
        { onSuccess: () => reset({ name: "" }) },
      );
    },
    [createVirtualAnnotatorMutation, project.id, reset],
  );
  const handleError: SubmitErrorHandler<VirtualAnnotatorCreateFormValues> = (data) => console.error(data);

  // rename
  const { mutate: updateVirtualAnnotatorMutation } = UserHooks.useUpdateVirtualAnnotator();
  const handleRename = useCallback(
    (annotator: UserRead, name: string) => {
      const trimmed = name.trim();
      if (trimmed.length === 0 || trimmed === annotator.first_name) return;
      updateVirtualAnnotatorMutation({ userId: annotator.id, requestBody: { name: trimmed } });
    },
    [updateVirtualAnnotatorMutation],
  );

  // delete
  const openConfirmationDialog = useOpenConfirmationDialog();
  const { mutate: deleteVirtualAnnotatorMutation } = UserHooks.useDeleteVirtualAnnotator();
  const handleClickDelete = useCallback(
    (annotator: UserRead) => {
      openConfirmationDialog({
        text: `Do you really want to delete the virtual annotator "${annotator.first_name}"? All its annotations are deleted as well. This cannot be undone.`,
        onAccept: () => deleteVirtualAnnotatorMutation({ userId: annotator.id }),
      });
    },
    [deleteVirtualAnnotatorMutation, openConfirmationDialog],
  );

  return (
    <Box display="flex" className="myFlexContainer h100">
      <form onSubmit={handleSubmit(handleVirtualAnnotatorCreation, handleError)}>
        <Toolbar variant="dense" className="myFlexFitContentContainer">
          <Stack direction="row" spacing={2} sx={{ width: "100%", alignItems: "center" }}>
            <Typography variant="h6" component="div" flexShrink={0}>
              Add virtual annotator
            </Typography>
            <FormText
              name="name"
              control={control}
              rules={{ validate: (value) => value.trim().length > 0 || "Name is required" }}
              textFieldProps={{
                label: "Name",
                placeholder: "e.g. ExperimentA-Run1",
                variant: "outlined",
                fullWidth: true,
                error: Boolean(errors.name),
                helperText: errors.name?.message,
                size: "small",
              }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              type="submit"
              loading={isPending}
              loadingPosition="start"
              sx={{ flexShrink: 0 }}
            >
              Add
            </Button>
          </Stack>
        </Toolbar>
      </form>
      <Typography variant="body2" color="textSecondary" sx={{ px: 3, pb: 1 }}>
        Virtual annotators own annotations without being able to log in, e.g. the annotations of an LLM Assistant run or
        an agreed group standard. You can annotate as a virtual annotator in the annotation view.
      </Typography>

      <Divider />
      {virtualAnnotators.isLoading && <CardContent>Loading virtual annotators...</CardContent>}
      {virtualAnnotators.isError && (
        <CardContent>An error occurred while loading the virtual annotators of project {project.id}...</CardContent>
      )}
      {virtualAnnotators.isSuccess && virtualAnnotators.data.length === 0 && (
        <CardContent>This project has no virtual annotators yet.</CardContent>
      )}
      {virtualAnnotators.isSuccess && (
        <List style={{ maxHeight: "100%", overflowY: "auto" }}>
          {virtualAnnotators.data.map((annotator) => (
            <ListItem
              key={annotator.id}
              secondaryAction={
                <Tooltip title="Delete virtual annotator and its annotations">
                  <IconButton onClick={() => handleClickDelete(annotator)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              }
            >
              <ListItemIcon>{getIconComponent(Icon.VIRTUAL_ANNOTATOR)}</ListItemIcon>
              <EditableTypography
                value={annotator.first_name}
                onChange={(name) => handleRename(annotator, name)}
                whiteColor={false}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
});
