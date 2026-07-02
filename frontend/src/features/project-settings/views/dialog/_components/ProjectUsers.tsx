import { UserHooks } from "@api/hooks/UserHooks";
import { FormEmail } from "@components/form-inputs";
import { useOpenConfirmationDialog } from "@core/notification";
import { ProjectRead } from "@models/ProjectRead";
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
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { EMAIL_REGEX } from "@utils/GlobalConstants";
import { memo, useCallback } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";

interface UserAddFormValues {
  email: string;
}

interface ProjectUsersProps {
  project: ProjectRead;
}

export const ProjectUsers = memo(({ project }: ProjectUsersProps) => {
  // query all users that belong to the project
  const allUsers = UserHooks.useGetAllUsers();

  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<UserAddFormValues>({
    defaultValues: {
      email: "",
    },
  });

  // form handling
  const addUserMutation = UserHooks.useAddUserToProject();
  const handleAddUser: SubmitHandler<UserAddFormValues> = useCallback(
    (data) => {
      addUserMutation.mutate({
        projId: project.id,
        requestBody: {
          email: data.email,
        },
      });
    },
    [addUserMutation, project.id],
  );

  const handleError: SubmitErrorHandler<UserAddFormValues> = useCallback((data) => console.error(data), []);

  // remove user
  const openConfirmationDialog = useOpenConfirmationDialog();
  const removeUserMutation = UserHooks.useRemoveUserFromProject();
  const handleClickRemoveUser = useCallback(
    (userId: number) => {
      openConfirmationDialog({
        text: `Do you really want to remove the User ${userId} from this project? You can add her again.`,
        onAccept: () => {
          removeUserMutation.mutate({
            projId: project.id,
            userId: userId,
          });
        },
      });
    },
    [project.id, removeUserMutation, openConfirmationDialog],
  );

  return (
    <Box display="flex" className="myFlexContainer h100">
      <form onSubmit={handleSubmit(handleAddUser, handleError)}>
        <Toolbar variant="dense" className="myFlexFitContentContainer">
          <Stack direction="row" spacing={2} sx={{ width: "100%", alignItems: "center" }}>
            <Typography variant="h6" component="div" flexShrink={0}>
              Add user
            </Typography>
            <FormEmail
              name="email"
              control={control}
              rules={{
                required: "E-Mail is required",
                validate: (value) => {
                  return [EMAIL_REGEX].every((pattern) => pattern.test(value)) || "Please enter a valid email address!";
                },
              }}
              textFieldProps={{
                label: "E-Mail",
                variant: "outlined",
                fullWidth: true,
                error: Boolean(errors.email),
                size: "small",
              }}
            />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              sx={{ ml: 1 }}
              type="submit"
              disabled={addUserMutation.isPending}
              loading={addUserMutation.isPending}
              loadingPosition="start"
            >
              Add
            </Button>
          </Stack>
        </Toolbar>
      </form>

      <Divider />
      {allUsers.isLoading && <CardContent>Loading users...</CardContent>}
      {allUsers.isError && (
        <CardContent>An error occurred while loading project users for project {project.id}...</CardContent>
      )}
      {allUsers.isSuccess && (
        <List style={{ maxHeight: "100%" }}>
          {allUsers.data.map((user) => (
            <ListItem
              disablePadding
              key={user.id}
              secondaryAction={
                <Tooltip title={"Remove user from project"}>
                  <span>
                    <IconButton onClick={() => handleClickRemoveUser(user.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </span>
                </Tooltip>
              }
            >
              <ListItemButton>
                <ListItemText primary={user.first_name + " " + user.last_name + " - " + user.email + ""} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
});
