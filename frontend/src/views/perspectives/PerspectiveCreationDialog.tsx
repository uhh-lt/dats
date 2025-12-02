import { ErrorMessage } from "@hookform/error-message";
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
import { useState } from "react";
import { SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { AspectCreate } from "../../api/openapi/models/AspectCreate.ts";
import { DocType } from "../../api/openapi/models/DocType.ts";
import PerspectivesHooks from "../../api/PerspectivesHooks.ts";
import FormText from "../../components/FormInputs/FormText.tsx";
import FormTextMultiline from "../../components/FormInputs/FormTextMultiline.tsx";
import DATSDialogHeader from "../../components/MUI/DATSDialogHeader.tsx";
import TagSelector from "../../components/Tag/TagSelector.tsx";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";
import { RootState } from "../../store/store.ts";
import DocTypeSelector from "../analysis/CodeFrequency/DocTypeSelector.tsx";

interface AspectTemplate {
  name: string;
  description: string;
  doc_embedding_prompt: string;
  doc_modification_prompt?: string | null;
}

const templates: AspectTemplate[] = [
  {
    name: "Topic Discovery",
    description: "Group documents by their main topic.",
    doc_embedding_prompt: "Identify the main topic or theme of the document",
    doc_modification_prompt: "",
    // "Summarize the document, analyzing the topics of the document. Conclude with a possible topic categorization of it.",
  },
  {
    name: "Sentiment Analysis",
    description: "Group documents by their overall sentiment.",
    doc_embedding_prompt: "Identify the main sentiment of the document",
    doc_modification_prompt: "",
    // "Summarize the document, analyzing the sentiment of the document. Conclude with a categorization of it as positive, negative, or neutral.",
  },
  {
    name: "Style Analysis",
    description: "Group documents by their writing style.",
    doc_embedding_prompt: "Identify the main writing style of the document",
    doc_modification_prompt: "",
    // "Summarize the document, analyzing the writing style of the document. Conclude with a possible style categorization of it.",
  },
  {
    name: "Narrative Structure",
    description: "Group documents by their narrative structure.",
    doc_embedding_prompt: "Identify the main narrative structure of the document",
    doc_modification_prompt: "",
    // "Summarize the document, analyzing the narrative structure of the document. Conclude with a possible narrative structure categorization of it.",
  },
];

interface PerspectiveCreationDialogProps {
  open: boolean;
  onClose: () => void;
}

function PerspectiveCreationDialog({ open, onClose }: PerspectiveCreationDialogProps) {
  const projectId = useAppSelector((state: RootState) => state.project.projectId);

  // perspective creation
  const navigate = useNavigate();
  const [selectedDocType, setSelectedDocType] = useState<DocType>(DocType.TEXT);
  const [tagId, setTagId] = useState<number | null>(null);
  const {
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    reset,
  } = useForm<AspectCreate>({
    defaultValues: {
      name: "",
      doc_embedding_prompt: "",
      doc_modification_prompt: "",
    },
  });
  const createAspectMutation = PerspectivesHooks.useCreateAspect();
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
        onSuccess: (aspect) => navigate(`/project/${aspect.project_id}/perspectives/dashboard/${aspect.id}`),
      },
    );
  };
  const handleError: SubmitErrorHandler<AspectCreate> = (error) => {
    console.error(error);
  };

  // handle click on card
  const handleClick = (template: AspectTemplate) => () => {
    // setValue("name", template.name);
    setValue("doc_embedding_prompt", template.doc_embedding_prompt);
    setValue("doc_modification_prompt", template.doc_modification_prompt || "");
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
        title="Create Perspective"
        onClose={onClose}
        isMaximized={isMaximized}
        onToggleMaximize={handleToggleMaximize}
      />
      <DialogContent>
        <Stack spacing={2}>
          <FormText
            name="name"
            control={control}
            rules={{
              required: "Perspective name is required",
            }}
            textFieldProps={{
              label: "Perspective name",
              variant: "outlined",
              fullWidth: true,
              error: Boolean(errors.name),
              helperText: <ErrorMessage errors={errors} name="name" />,
            }}
          />
          <Typography variant="button">Documents</Typography>
          <DocTypeSelector docTypes={selectedDocType} onDocTypeChange={setSelectedDocType} title="Modality" fullWidth />
          <TagSelector tagIds={tagId} onTagIdChange={setTagId} title="Select Tag" fullWidth />
          <Typography variant="button">Parameters</Typography>
          <Stack direction="row" spacing={2} sx={{ overflowX: "auto", paddingBottom: 2, mt: 0.5 }}>
            {templates.map((template, index) => (
              <Card key={index} elevation={5} style={{ width: "100%" }} sx={{ backgroundColor: "primary.dark" }}>
                <CardActionArea onClick={handleClick(template)}>
                  <CardContent style={{ textAlign: "center" }} sx={{ color: "primary.contrastText", p: 2 }}>
                    <h3 style={{ marginTop: 0 }}>{template.name}</h3>
                    {template.description}
                  </CardContent>
                </CardActionArea>
              </Card>
            ))}
          </Stack>
          <FormText
            name="doc_embedding_prompt"
            control={control}
            rules={{
              required: "Document embedding prompt is required",
            }}
            textFieldProps={{
              label: "Document embedding instruction",
              placeholder: "Describe on which aspect you want the model to focus.",
              variant: "outlined",
              fullWidth: true,
              error: Boolean(errors.doc_embedding_prompt),
              helperText: <ErrorMessage errors={errors} name="doc_embedding_prompt" />,
            }}
          />
          <FormTextMultiline
            name="doc_modification_prompt"
            control={control}
            textFieldProps={{
              label: "Document modification prompt",
              placeholder: "Optional! Describe how you want to modify the document.",
              variant: "outlined",
              fullWidth: true,
              error: Boolean(errors.doc_modification_prompt),
              helperText: <ErrorMessage errors={errors} name="doc_modification_prompt" />,
            }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3 }}>
        <Button onClick={() => reset()}>Reset Parameters</Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          type="submit"
          loading={createAspectMutation.isPending}
          loadingPosition="start"
        >
          Create Map
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default PerspectiveCreationDialog;
