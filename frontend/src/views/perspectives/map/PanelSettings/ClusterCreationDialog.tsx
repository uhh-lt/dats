import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { Button, Dialog, DialogActions, DialogContent, Stack, Tooltip, Typography } from "@mui/material";
import { useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { ClusterCreate } from "../../../../api/openapi/models/ClusterCreate.ts";
import { PerspectivesJobType } from "../../../../api/openapi/models/PerspectivesJobType.ts";
import PerspectivesHooks from "../../../../api/PerspectivesHooks.ts";
import FormText from "../../../../components/FormInputs/FormText.tsx";
import FormTextMultiline from "../../../../components/FormInputs/FormTextMultiline.tsx";
import DATSDialogHeader from "../../../../components/MUI/DATSDialogHeader.tsx";
import { useDialogMaximize } from "../../../../hooks/useDialogMaximize.ts";
import { useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { RootState } from "../../../../store/store.ts";

interface ClusterCreationDialogProps {
  aspectId: number;
}

function ClusterCreationDialog({ aspectId }: ClusterCreationDialogProps) {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);

  // dialog state
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // project creation
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<ClusterCreate>({
    defaultValues: {
      name: "",
      description: "",
    },
  });
  const { mutate: startPerspectivesJobMutation, isPending } = PerspectivesHooks.useStartPerspectivesJob();
  const handleClusterCreation: SubmitHandler<ClusterCreate> = (data) => {
    if (!projectId) {
      console.error("Project ID is not set");
      return;
    }

    startPerspectivesJobMutation(
      {
        aspectId: aspectId,
        requestBody: {
          perspectives_job_type: PerspectivesJobType.CREATE_CLUSTER_WITH_NAME,
          create_dto: {
            aspect_id: aspectId,
            name: data.name,
            description: data.description,
            parent_cluster_id: null, // no parent cluster for new clusters
            level: 0, // default level for new clusters
          },
        },
      },
      {
        onSuccess: () => handleClose(),
      },
    );
  };
  const handleError: SubmitErrorHandler<ClusterCreate> = (error) => {
    console.error(error);
  };

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <>
      <Tooltip
        enterDelay={500}
        placement="bottom-start"
        title={
          <>
            <Typography color="inherit">Cluster Creation</Typography>
            This action allows you to <em>create</em> a new cluster. Based on your provided title and description,
            similar documents are assigned to the new cluster.
          </>
        }
      >
        <span>
          <Button onClick={handleOpen} disabled={isPending}>
            Add
          </Button>
        </span>
      </Tooltip>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMaximized}
        component="form"
        onSubmit={handleSubmit(handleClusterCreation, handleError)}
      >
        <DATSDialogHeader
          title="Create new cluster"
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={toggleMaximize}
        />
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <Typography variant="body2">
              {" "}
              This action allows you to <em>create</em> a new cluster. Based on your provided title and description,
              similar documents are assigned to the new cluster.
            </Typography>
            <FormText
              name="name"
              control={control}
              rules={{
                required: "Cluster name is required",
              }}
              textFieldProps={{
                label: "Cluster name",
                variant: "outlined",
                fullWidth: true,
                error: Boolean(errors.name),
              }}
            />
            <FormTextMultiline
              name="description"
              control={control}
              rules={{
                required: "Description is required",
              }}
              textFieldProps={{
                label: "Cluster description",
                placeholder: "Describe the cluster in detail...",
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
            Create Cluster
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default ClusterCreationDialog;
