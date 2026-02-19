import { ErrorMessage } from "@hookform/error-message";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SaveIcon from "@mui/icons-material/Save";
import TuneIcon from "@mui/icons-material/Tune";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Controller, SubmitErrorHandler, SubmitHandler, useForm } from "react-hook-form";
import { AspectCreate } from "../../api/openapi/models/AspectCreate.ts";
import { DocType } from "../../api/openapi/models/DocType.ts";
import { PipelineSettings } from "../../api/openapi/models/PipelineSettings.ts";
import PerspectivesHooks from "../../api/PerspectivesHooks.ts";
import FormText from "../../components/FormInputs/FormText.tsx";
import FormTextMultiline from "../../components/FormInputs/FormTextMultiline.tsx";
import DATSDialogHeader from "../../components/MUI/DATSDialogHeader.tsx";
import TagSelector from "../../components/Tag/TagSelector.tsx";
import { useDialogMaximize } from "../../hooks/useDialogMaximize.ts";
import { useAppSelector } from "../../plugins/ReduxHooks.ts";
import { RootState } from "../../store/store.ts";
import DocTypeSelector from "../analysis/CodeFrequency/DocTypeSelector.tsx";

interface AspectTemplate {
  name: string;
  description: string;
  doc_embedding_prompt: string;
  doc_modification_prompt?: string | null;
}

/** Advanced pipeline parameters for expert users */
const defaultAdvancedSettings: PipelineSettings = {
  umap_n_neighbors: 15,
  umap_n_components: 10,
  umap_min_dist: 0.1,
  umap_metric: "cosine",
  hdbscan_min_cluster_size: 10,
  hdbscan_metric: "euclidean",
  num_keywords: 50,
  num_top_documents: 5,
};

/** Combined form data type for perspective creation */
type PerspectiveFormData = Pick<AspectCreate, "name" | "doc_embedding_prompt" | "doc_modification_prompt"> &
  PipelineSettings;

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

  // expert mode toggle
  const [expertMode, setExpertMode] = useState(false);

  const {
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    reset,
  } = useForm<PerspectiveFormData>({
    defaultValues: {
      name: "",
      doc_embedding_prompt: "",
      doc_modification_prompt: "",
      ...defaultAdvancedSettings,
    },
  });

  const createAspectMutation = PerspectivesHooks.useCreateAspect();
  const handleAspectCreation: SubmitHandler<PerspectiveFormData> = (data) => {
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
          modality: selectedDocType,
          tag_id: tagId,
          pipeline_settings: {
            ...defaultAdvancedSettings,
            umap_min_dist: data.umap_min_dist,
            umap_metric: data.umap_metric,
            umap_n_neighbors: data.umap_n_neighbors,
            hdbscan_metric: data.hdbscan_metric,
            hdbscan_min_cluster_size: data.hdbscan_min_cluster_size,
            num_keywords: data.num_keywords,
            num_top_documents: data.num_top_documents,
          },
        },
      },
      {
        onSuccess: (aspect) =>
          navigate({
            to: "/project/$projectId/perspectives/$aspectId",
            params: { projectId: aspect.project_id, aspectId: aspect.id },
          }),
      },
    );
  };
  const handleError: SubmitErrorHandler<PerspectiveFormData> = (error) => {
    console.error(error);
  };

  // handle click on card
  const handleClick = (template: AspectTemplate) => () => {
    // setValue("name", template.name);
    setValue("doc_embedding_prompt", template.doc_embedding_prompt);
    setValue("doc_modification_prompt", template.doc_modification_prompt || "");
  };

  // maximize dialog
  const { isMaximized, toggleMaximize } = useDialogMaximize();

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
        onToggleMaximize={toggleMaximize}
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
            disabled={selectedDocType !== DocType.TEXT}
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

          <Accordion
            expanded={expertMode}
            onChange={(_, expanded) => setExpertMode(expanded)}
            variant="outlined"
            sx={{ mt: 2 }}
            disableGutters
          >
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <TuneIcon fontSize="small" />
                <Typography variant="button">Advanced Pipeline Settings</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={3}>
                {/* UMAP Settings */}
                <Typography variant="subtitle2" color="text.secondary">
                  Dimensionality Reduction (UMAP)
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Controller
                    name="umap_n_neighbors"
                    control={control}
                    rules={{
                      required: "N Neighbors is required",
                      min: { value: 2, message: "Minimum value is 2" },
                      max: { value: 100, message: "Maximum value is 100" },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="N Neighbors"
                        type="number"
                        size="small"
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || defaultAdvancedSettings.umap_n_neighbors)
                        }
                        inputProps={{ min: 2, max: 100 }}
                        error={Boolean(errors.umap_n_neighbors)}
                        helperText={
                          errors.umap_n_neighbors?.message ||
                          `Number of neighbors for local structure (default: ${defaultAdvancedSettings.umap_n_neighbors})`
                        }
                        fullWidth
                      />
                    )}
                  />
                  <Controller
                    name="umap_n_components"
                    control={control}
                    rules={{
                      required: "N Components is required",
                      min: { value: 2, message: "Minimum value is 2" },
                      max: { value: 100, message: "Maximum value is 100" },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="N Components"
                        type="number"
                        size="small"
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || defaultAdvancedSettings.umap_n_components)
                        }
                        inputProps={{ min: 2, max: 100 }}
                        error={Boolean(errors.umap_n_components)}
                        helperText={
                          errors.umap_n_components?.message ||
                          `Number of components for dimensionality reduction (default: ${defaultAdvancedSettings.umap_n_components})`
                        }
                        fullWidth
                      />
                    )}
                  />
                  <Controller
                    name="umap_min_dist"
                    control={control}
                    rules={{
                      required: "Min Distance is required",
                      min: { value: 0, message: "Minimum value is 0" },
                      max: { value: 1, message: "Maximum value is 1" },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Min Distance"
                        type="number"
                        size="small"
                        onChange={(e) =>
                          field.onChange(parseFloat(e.target.value) || defaultAdvancedSettings.umap_min_dist)
                        }
                        inputProps={{ min: 0, max: 1, step: 0.05 }}
                        error={Boolean(errors.umap_min_dist)}
                        helperText={
                          errors.umap_min_dist?.message ||
                          `Minimum distance between points (default: ${defaultAdvancedSettings.umap_min_dist})`
                        }
                        fullWidth
                      />
                    )}
                  />
                  <Controller
                    name="umap_metric"
                    control={control}
                    rules={{ required: "Distance metric is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Distance Metric"
                        select
                        size="small"
                        error={Boolean(errors.umap_metric)}
                        helperText={errors.umap_metric?.message || "Metric for measuring distances"}
                        fullWidth
                      >
                        <MenuItem value="cosine">Cosine</MenuItem>
                        <MenuItem value="euclidean">Euclidean</MenuItem>
                      </TextField>
                    )}
                  />
                </Stack>

                {/* HDBSCAN Settings */}
                <Typography variant="subtitle2" color="text.secondary">
                  Density-based Clustering (HDBSCAN)
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Controller
                    name="hdbscan_min_cluster_size"
                    control={control}
                    rules={{
                      required: "Min Cluster Size is required",
                      min: { value: 1, message: "Minimum value is 1" },
                      max: { value: 200, message: "Maximum value is 200" },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Min Cluster Size"
                        type="number"
                        size="small"
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || defaultAdvancedSettings.hdbscan_min_cluster_size)
                        }
                        inputProps={{ min: 1, max: 200 }}
                        error={Boolean(errors.hdbscan_min_cluster_size)}
                        helperText={
                          errors.hdbscan_min_cluster_size?.message ||
                          `Minimum cluster size (default: ${defaultAdvancedSettings.hdbscan_min_cluster_size})`
                        }
                        fullWidth
                      />
                    )}
                  />
                  <Controller
                    name="hdbscan_metric"
                    control={control}
                    rules={{ required: "Distance metric is required" }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Distance Metric"
                        select
                        size="small"
                        error={Boolean(errors.hdbscan_metric)}
                        helperText={errors.hdbscan_metric?.message || "Metric for measuring distances"}
                        fullWidth
                      >
                        <MenuItem value="euclidean">Euclidean</MenuItem>
                        <MenuItem value="cosine">Cosine</MenuItem>
                      </TextField>
                    )}
                  />
                </Stack>

                {/* Keyword Extraction Settings */}
                <Typography variant="subtitle2" color="text.secondary">
                  Cluster Representation
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Controller
                    name="num_keywords"
                    control={control}
                    rules={{
                      required: "Number of keywords is required",
                      min: { value: 5, message: "Minimum value is 5" },
                      max: { value: 200, message: "Maximum value is 200" },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Number of Keywords"
                        type="number"
                        size="small"
                        fullWidth
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || defaultAdvancedSettings.num_keywords)
                        }
                        inputProps={{ min: 5, max: 200 }}
                        error={Boolean(errors.num_keywords)}
                        helperText={
                          errors.num_keywords?.message ||
                          `Number of keywords to extract per cluster (default: ${defaultAdvancedSettings.num_keywords})`
                        }
                      />
                    )}
                  />
                  <Controller
                    name="num_top_documents"
                    control={control}
                    rules={{
                      required: "Number of top documents is required",
                      min: { value: 1, message: "Minimum value is 1" },
                      max: { value: 200, message: "Maximum value is 200" },
                    }}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Number of Top Documents"
                        type="number"
                        size="small"
                        fullWidth
                        onChange={(e) =>
                          field.onChange(parseInt(e.target.value) || defaultAdvancedSettings.num_top_documents)
                        }
                        inputProps={{ min: 1, max: 200 }}
                        error={Boolean(errors.num_top_documents)}
                        helperText={
                          errors.num_top_documents?.message ||
                          `Number of top documents to extract per cluster (default: ${defaultAdvancedSettings.num_top_documents})`
                        }
                      />
                    )}
                  />
                </Stack>
              </Stack>
            </AccordionDetails>
          </Accordion>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3 }}>
        <Button
          onClick={() => {
            reset();
          }}
        >
          Reset Parameters
        </Button>
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
