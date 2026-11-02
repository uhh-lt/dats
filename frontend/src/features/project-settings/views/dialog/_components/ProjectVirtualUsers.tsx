import { EditableTypography } from "@components/EditableTypography";
import { FormText } from "@components/form-inputs";
import { getIconComponent, Icon } from "@components/icons";
import { useTabNavigate } from "@core/navigation";
import { useOpenConfirmationDialog } from "@core/notification";
import { UserHooks } from "@core/user";
// eslint-disable-next-line boundaries/element-types
import { experimentQueries } from "@features/experiment-studio";
import { ExperimentRead } from "@models/ExperimentRead";
import { ExperimentRunRead } from "@models/ExperimentRunRead";
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
  Link,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { useDialogBus } from "@store/global/dialogBusHooks";
import { useQuery } from "@tanstack/react-query";
import { memo, useCallback, useMemo } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";

interface VirtualUserCreateFormValues {
  name: string;
}

/** The experiment run that writes into a virtual user. */
interface RunOfUser {
  experiment: ExperimentRead;
  run: ExperimentRunRead;
}

interface ProjectVirtualUsersProps {
  project: ProjectRead;
}

/**
 * Lists the virtual users of the project: users that cannot log in and own annotations, e.g. of LLM Assistant runs.
 * They can be created, renamed and deleted (together with all their annotations). The virtual users of experiment runs
 * are managed by their experiment in the Experiment Studio: they can be neither renamed nor deleted here.
 */
export const ProjectVirtualUsers = memo(({ project }: ProjectVirtualUsersProps) => {
  const virtualUsers = UserHooks.useGetVirtualUsers();

  // the experiment run of every run user
  const experiments = useQuery(experimentQueries.byProject(project.id));
  const runsByUserId = useMemo(() => {
    const runs = new Map<number, RunOfUser>();
    Object.values(experiments.data ?? {}).forEach((experiment) =>
      experiment.runs.forEach((run) => runs.set(run.virtual_user_id, { experiment, run })),
    );
    return runs;
  }, [experiments.data]);

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
  const { mutate: updateVirtualUserMutation } = UserHooks.useUpdateUser();
  const handleRename = useCallback(
    (virtualUser: UserRead, name: string) => {
      const trimmed = name.trim();
      if (trimmed.length === 0 || trimmed === virtualUser.first_name) return;
      updateVirtualUserMutation({ userId: virtualUser.id, requestBody: { first_name: trimmed } });
    },
    [updateVirtualUserMutation],
  );

  // delete
  const openConfirmationDialog = useOpenConfirmationDialog();
  const { mutate: deleteVirtualUserMutation } = UserHooks.useDeleteUser();
  const handleClickDelete = useCallback(
    (virtualUser: UserRead) => {
      openConfirmationDialog({
        text: `Do you really want to delete the virtual user "${virtualUser.first_name}"? All its annotations are deleted as well. This cannot be undone.`,
        onAccept: () => deleteVirtualUserMutation({ userId: virtualUser.id }),
      });
    },
    [deleteVirtualUserMutation, openConfirmationDialog],
  );

  // run users link to their experiment
  const tabNavigate = useTabNavigate();
  const { close: closeSettings } = useDialogBus("projectSettings");
  const handleOpenExperiment = useCallback(
    (experimentId: number) => {
      closeSettings();
      tabNavigate({
        to: "/project/$projectId/experiments/$experimentId",
        params: { projectId: project.id, experimentId },
      });
    },
    [closeSettings, project.id, tabNavigate],
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
                placeholder: "e.g. Group standard",
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
        agreed group standard. You can annotate as a virtual user in the annotation view. The virtual users of
        experiment runs are managed in the Experiment Studio.
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
          {virtualUsers.data.map((virtualUser) => {
            const runOfUser = runsByUserId.get(virtualUser.id);
            if (runOfUser) {
              return (
                <RunUserListItem
                  key={virtualUser.id}
                  virtualUser={virtualUser}
                  runOfUser={runOfUser}
                  onOpenExperiment={handleOpenExperiment}
                />
              );
            }
            return (
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
            );
          })}
        </List>
      )}
    </Box>
  );
});

interface RunUserListItemProps {
  virtualUser: UserRead;
  runOfUser: RunOfUser;
  onOpenExperiment: (experimentId: number) => void;
}

/** The virtual user of an experiment run: its experiment renames and deletes it, so both are disabled here. */
function RunUserListItem({ virtualUser, runOfUser: { experiment, run }, onOpenExperiment }: RunUserListItemProps) {
  const hint = `Run '${run.name}' of experiment '${experiment.name}': manage it in the Experiment Studio`;
  return (
    <ListItem
      secondaryAction={
        <Tooltip title={hint}>
          <span>
            <IconButton aria-label="Delete virtual user and its annotations" disabled>
              <DeleteIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    >
      <ListItemIcon>{getIconComponent(Icon.VIRTUAL_USER)}</ListItemIcon>
      <ListItemText
        primary={virtualUser.first_name}
        secondary={
          <>
            Run &apos;{run.name}&apos; of experiment &apos;{experiment.name}&apos;: manage it in the{" "}
            <Link component="button" variant="body2" onClick={() => onOpenExperiment(experiment.id)}>
              Experiment Studio
            </Link>
          </>
        }
      />
    </ListItem>
  );
}
