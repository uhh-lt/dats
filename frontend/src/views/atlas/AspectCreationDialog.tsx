import { ErrorMessage } from "@hookform/error-message";
import SaveIcon from "@mui/icons-material/Save";
import { Button, Dialog, DialogActions, DialogContent, Stack, Typography } from "@mui/material";
import { useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { AspectCreate } from "../../api/openapi/models/AspectCreate.ts";
import TopicModellingHooks from "../../api/TopicModellingHooks.ts";
import FormText from "../../components/FormInputs/FormText.tsx";
import FormTextMultiline from "../../components/FormInputs/FormTextMultiline.tsx";
import DATSDialogHeader from "../../components/MUI/DATSDialogHeader.tsx";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";
import { RootState } from "../../store/store.ts";

interface AspectCreationDialogProps {
  open: boolean;
  onClose: () => void;
}

function AspectCreationDialog({ open, onClose }: AspectCreationDialogProps) {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);

  // project creation
  const navigate = useNavigate();
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<AspectCreate>({
    defaultValues: {
      name: "",
      doc_embedding_prompt: "",
      doc_modification_prompt: "",
    },
  });
  const createAspectMutation = TopicModellingHooks.useCreateAspect();
  const handleAspectCreation: SubmitHandler<AspectCreate> = (data) => {
    if (!projectId) {
      console.error("Project ID is not set");
      return;
    }

    createAspectMutation.mutate(
      {
        requestBody: {
          name: data.name,
          doc_embedding_prompt: data.doc_embedding_prompt,
          doc_modification_prompt: data.doc_modification_prompt || null,
          is_hierarchical: false,
          project_id: projectId,
        },
      },
      {
        onSuccess: (aspect) => navigate(`/project/${aspect.project_id}/atlas/map-details/${aspect.id}`),
      },
    );
  };
  const handleError: SubmitErrorHandler<AspectCreate> = (error) => {
    console.error(error);
  };

  // maximize dialog
  const [isMaximized, setIsMaximized] = useState(false);
  const handleToggleMaximize = () => {
    setIsMaximized((prev) => !prev);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMaximized}
      component="form"
      onSubmit={handleSubmit(handleAspectCreation, handleError)}
    >
      <DATSDialogHeader
        title="Create new aspect"
        onClose={onClose}
        isMaximized={isMaximized}
        onToggleMaximize={handleToggleMaximize}
      />
      <DialogContent>
        <Stack spacing={2} pt={1}>
          <Typography variant="body2">
            TODO: Offer pre-defined aspects to choose from, or allow users to create their own aspects.
          </Typography>
          <FormText
            name="name"
            control={control}
            rules={{
              required: "Aspect name is required",
            }}
            textFieldProps={{
              label: "Aspect name",
              variant: "outlined",
              fullWidth: true,
              error: Boolean(errors.name),
            }}
          />
          <FormTextMultiline
            name="doc_modification_prompt"
            control={control}
            textFieldProps={{
              label: "Document modification prompt",
              placeholder: "Describe how you want to modify the document.",
              variant: "outlined",
              fullWidth: true,
              error: Boolean(errors.doc_modification_prompt),
              helperText: <ErrorMessage errors={errors} name="doc_modification_prompt" />,
            }}
          />
          <FormTextMultiline
            name="doc_embedding_prompt"
            control={control}
            rules={{
              required: "Document embedding prompt is required",
            }}
            textFieldProps={{
              label: "Document embedding prompt",
              placeholder: "Describe your project aim, method, and material used in a short abstract.",
              variant: "outlined",
              fullWidth: true,
              error: Boolean(errors.doc_embedding_prompt),
              helperText: <ErrorMessage errors={errors} name="doc_embedding_prompt" />,
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
          loading={createAspectMutation.isPending}
          loadingPosition="start"
          fullWidth
        >
          Create Aspect
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AspectCreationDialog;
