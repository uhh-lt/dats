import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { Button, Dialog, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { TMJobType } from "../../api/openapi/models/TMJobType.ts";
import { TopicCreate } from "../../api/openapi/models/TopicCreate.ts";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import FormText from "../../components/FormInputs/FormText.tsx";
import FormTextMultiline from "../../components/FormInputs/FormTextMultiline.tsx";
import DATSDialogHeader from "../../components/MUI/DATSDialogHeader.tsx";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";
import { RootState } from "../../store/store.ts";

interface TopicCreationDialogProps {
  aspectId: number;
}

function TopicCreationDialog({ aspectId }: TopicCreationDialogProps) {
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
  } = useForm<TopicCreate>({
    defaultValues: {
      name: "",
      description: "",
    },
  });
  const { mutate: startTMJobMutation, isPending } = TopicModellingHooks.useStartTMJob();
  const handleTopicCreation: SubmitHandler<TopicCreate> = (data) => {
    if (!projectId) {
      console.error("Project ID is not set");
      return;
    }

    startTMJobMutation(
      {
        aspectId: aspectId,
        requestBody: {
          tm_job_type: TMJobType.CREATE_TOPIC_WITH_NAME,
          create_dto: {
            aspect_id: aspectId,
            name: data.name,
            description: data.description,
            color: "#000000", // default color, can be changed later
            parent_topic_id: null, // no parent topic for new topics
            level: 0, // default level for new topics
          },
        },
      },
      {
        onSuccess: () => handleClose(),
      },
    );
  };
  const handleError: SubmitErrorHandler<TopicCreate> = (error) => {
    console.error(error);
  };

  // maximize dialog
  const [isMaximized, setIsMaximized] = useState(false);
  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  return (
    <>
      <Button onClick={handleOpen} disabled={isPending}>
        Add Topic
      </Button>
      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        fullScreen={isMaximized}
        component="form"
        onSubmit={handleSubmit(handleTopicCreation, handleError)}
      >
        <DATSDialogHeader
          title="Create new topic"
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={handleToggleMaximize}
        />
        <DialogContent>
          <Stack spacing={2} pt={1}>
            <Typography variant="body2">TODO: Color selection etc...</Typography>
            <FormText
              name="name"
              control={control}
              rules={{
                required: "Topic name is required",
              }}
              textFieldProps={{
                label: "Topic name",
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
                label: "Topic description",
                placeholder: "Describe the topic in detail...",
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
            Create Topic
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default TopicCreationDialog;
