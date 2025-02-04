import { ApproachType } from "../../../../api/openapi/models/ApproachType.ts";
import { useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import PromptEditorStep from "./PromptEditorStep.tsx";
import TrainingParameterEditorStep from "./TrainingParameterEditorStep.tsx";

function EditorStep() {
  // global state
  const approach = useAppSelector((state) => state.dialog.llmApproach);

  switch (approach) {
    case ApproachType.LLM_ZERO_SHOT:
      return <PromptEditorStep />;
    case ApproachType.LLM_FEW_SHOT:
      return <PromptEditorStep />;
    case ApproachType.MODEL_TRAINING:
      return <TrainingParameterEditorStep />;
    default:
      return <>Approach not supported</>;
  }
}

export default EditorStep;
