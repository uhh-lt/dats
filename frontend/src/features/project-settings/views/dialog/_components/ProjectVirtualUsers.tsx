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

interface VirtualUserCreateFormValues {
  name: string;
}

interface ProjectVirtualUsersProps {
  project: ProjectRead;
}

/**
 * Lists the virtual users of the project: users without login that own annotations, e.g. of LLM Assistant runs.
 * They can be created, renamed and deleted (together with all their annotations).
 */
export const ProjectVirtualUsers = memo(({ project }: ProjectVirtualUsersProps) => {
  const virtualUsers = UserHooks.useGetVirtualUsers();

  // create
  const {
    handleSubmit,
    formState: { errors },
    control,
    reset,
  } = useForm<VirtualUserCreateFormValues>({ defaultValues: { name: "" } });
  const { mutate: createVirtualUserMutation, isPending } = UserHooks.useCreateVirtualUser();
  const handleVirtualUserCreation = useCallback<SubmitHandler<VirtualUserCreateFormValues>>(
    (data) => {
      createVirtualUserMutation(
        { projectId: project.id, requestBody: { name: data.name.trim() } },
        { onSuccess: () => reset({ name: "" }) },
      );
    },
    [createVirtualUserMutation, project.id, reset],
  );
  const handleError: SubmitErrorHandler<VirtualUserCreateFormValues> = (data) => console.error(data);

  // rename
  const { mutate: updateVirtualUserMutation } = UserHooks.useUpdateVirtualUser();
  const handleRename = useCallback(
    (virtualUser: UserRead, name: string) => {
      const trimmed = name.trim();
      if (trimmed.length === 0 || trimmed === virtualUser.first_name) return;
      updateVirtualUserMutation({ userId: virtualUser.id, requestBody: { name: trimmed } });
    },
    [updateVirtualUserMutation],
  );

  // delete
  const openConfirmationDialog = useOpenConfirmationDialog();
  const { mutate: deleteVirtualUserMutation } = UserHooks.useDeleteVirtualUser();
  const handleClickDelete = useCallback(
    (virtualUser: UserRead) => {
      openConfirmationDialog({
        text: `Do you really want to delete the virtual user "${virtualUser.first_name}"? All its annotations are deleted as well. This cannot be undone.`,
        onAccept: () => deleteVirtualUserMutation({ userId: virtualUser.id }),
      });
    },
    [deleteVirtualUserMutation, openConfirmationDialog],
  );

  return (
    <Box display="flex" className="myFlexContainer h100">
      <form onSubmit={handleSubmit(handleVirtualUserCreation, handleError)}>
        <Toolbar variant="dense" className="myFlexFitContentContainer">
          <Stack direction="row" spacing={2} sx={{ width: "100%", alignItems: "center" }}>
            <Typography variant="h6" component="div" flexShrink={0}>
              Add virtual user
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
        Virtual users own annotations without being able to log in, e.g. the annotations of an LLM Assistant run or an
        agreed group standard. You can annotate as a virtual user in the annotation view.
      </Typography>

      <Divider />
      {virtualUsers.isLoading && <CardContent>Loading virtual users...</CardContent>}
      {virtualUsers.isError && (
        <CardContent>An error occurred while loading the virtual users of project {project.id}...</CardContent>
      )}
      {virtualUsers.isSuccess && virtualUsers.data.length === 0 && (
        <CardContent>This project has no virtual users yet.</CardContent>
      )}
      {virtualUsers.isSuccess && (
        <List style={{ maxHeight: "100%", overflowY: "auto" }}>
          {virtualUsers.data.map((virtualUser) => (
            <ListItem
              key={virtualUser.id}
              secondaryAction={
                <Tooltip title="Delete virtual user and its annotations">
                  <IconButton onClick={() => handleClickDelete(virtualUser)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
              }
            >
              <ListItemIcon>{getIconComponent(Icon.VIRTUAL_USER)}</ListItemIcon>
              <EditableTypography
                value={virtualUser.first_name}
                onChange={(name) => handleRename(virtualUser, name)}
                whiteColor={false}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
});
