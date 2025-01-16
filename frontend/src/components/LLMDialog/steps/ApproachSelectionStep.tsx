import PlayCircleIcon from "@mui/icons-material/PlayCircle";
import { LoadingButton } from "@mui/lab";
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import LLMHooks from "../../../api/LLMHooks.ts";
import { ApproachType } from "../../../api/openapi/models/ApproachType.ts";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../dialogSlice.ts";
import LLMUtterance from "./LLMUtterance.tsx";

const explanations: Record<ApproachType, string> = {
  [ApproachType.LLM_ZERO_SHOT]:
    "Zero-shot learning is a type of machine learning that is used to compute results based on a prompt without any examples.",
  [ApproachType.LLM_FEW_SHOT]:
    "Few-shot learning is a type of machine learning that is used to compute results based on a prompt with a few examples. Hence, labeled examples are needed.",
  [ApproachType.MODEL_TRAINING]:
    "Model training is a type of machine learning that is used to train a model based on labeled training data. This approach yields the best performance, but requires many labeled examples.",
};

function ApproachSelectionStep() {
  // global state
  const projectId = useAppSelector((state) => state.dialog.llmProjectId);
  const approachRecommendation = useAppSelector((state) => state.dialog.llmApproachRecommendation);
  const llmMethod = useAppSelector((state) => state.dialog.llmMethod);
  const metadata = useAppSelector((state) => state.dialog.llmMetadata);
  const codes = useAppSelector((state) => state.dialog.llmCodes);
  const tags = useAppSelector((state) => state.dialog.llmTags);
  const sdocIds = useAppSelector((state) => state.dialog.llmDocumentIds);
  const dispatch = useAppDispatch();

  // local state
  const [approachType, setApproachType] = useState(approachRecommendation.recommended_approach);
  const handleChange = (event: SelectChangeEvent) => {
    setApproachType(event.target.value as ApproachType);
  };

  // initiate next step (get the generated prompts)
  const createPromptTemplatesMutation = LLMHooks.useCreatePromptTemplates();
  const createTrainingParametersMutation = LLMHooks.useCreateTrainingParameters();

  const handleNext = () => {
    if (!llmMethod) return;

    // the next action depends on the selected approach
    switch (approachType) {
      case ApproachType.LLM_ZERO_SHOT:
      case ApproachType.LLM_FEW_SHOT:
        createPromptTemplatesMutation.mutate(
          {
            requestBody: {
              llm_job_type: llmMethod,
              project_id: projectId,
              specific_task_parameters: {
                llm_job_type: llmMethod,
                tag_ids: tags.map((tag) => tag.id),
                project_metadata_ids: metadata.map((m) => m.id),
                code_ids: codes.map((code) => code.id),
                sdoc_ids: sdocIds,
              },
            },
          },
          {
            onSuccess(data) {
              dispatch(CRUDDialogActions.llmDialogGoToPromptEditor({ prompts: data, approach: approachType }));
            },
          },
        );
        break;
      case ApproachType.MODEL_TRAINING:
        createTrainingParametersMutation.mutate(
          {
            requestBody: {
              llm_job_type: llmMethod,
              project_id: projectId,
              specific_task_parameters: {
                llm_job_type: llmMethod,
                tag_ids: tags.map((tag) => tag.id),
                project_metadata_ids: metadata.map((m) => m.id),
                code_ids: codes.map((code) => code.id),
                sdoc_ids: sdocIds,
              },
            },
          },
          {
            onSuccess(data) {
              dispatch(
                CRUDDialogActions.llmDialogGoToTrainingParameterEditor({
                  trainingParameters: data,
                  approach: approachType,
                }),
              );
            },
          },
        );
        break;
    }
  };

  const num_available_appproaches = Object.values(approachRecommendation.available_approaches).filter(
    (available) => available,
  ).length;

  console.log(approachRecommendation.reasoning);

  return (
    <>
      <DialogContent>
        <LLMUtterance>
          <Typography>
            {approachRecommendation.reasoning.split("\n").map((utterance, idx) => (
              <React.Fragment key={idx}>
                {utterance}
                <br />
              </React.Fragment>
            ))}
            {num_available_appproaches > 1 ? " You can change the approach if you want." : ""}
          </Typography>
        </LLMUtterance>
        <FormControl sx={{ ml: 12.5, my: 2 }}>
          <InputLabel id="approach-selection-label">Approach</InputLabel>
          <Select
            labelId="approach-selection-label"
            id="approach-selection"
            value={approachType}
            label="Approach"
            onChange={handleChange}
          >
            {Object.values(ApproachType).map((approach) => (
              <MenuItem value={approach} disabled={!approachRecommendation.available_approaches[approach.valueOf()]}>
                {approach}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <LLMUtterance>
          <Typography>{explanations[approachType as ApproachType]}</Typography>
        </LLMUtterance>
      </DialogContent>
      <DialogActions>
        <Box flexGrow={1} />
        <Button
          disabled={createPromptTemplatesMutation.isPending}
          onClick={() => dispatch(CRUDDialogActions.previousLLMDialogStep())}
        >
          Back
        </Button>
        <LoadingButton
          variant="contained"
          startIcon={<PlayCircleIcon />}
          loading={createPromptTemplatesMutation.isPending}
          loadingPosition="start"
          onClick={handleNext}
        >
          Next!
        </LoadingButton>
      </DialogActions>
    </>
  );
}

export default ApproachSelectionStep;
