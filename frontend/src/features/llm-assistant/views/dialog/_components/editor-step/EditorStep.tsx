import { ApproachType } from "@api/models/ApproachType";
import { useAppSelector } from "@plugins/redux";
import { memo } from "react";
import { PromptEditorStep } from "./PromptEditorStep";

export const EditorStep = memo(() => {
  // global state
  const approach = useAppSelector((state) => state.llmAssistant.llmApproach);

  switch (approach) {
    case ApproachType.LLM_ZERO_SHOT:
      return <PromptEditorStep />;
    case ApproachType.LLM_FEW_SHOT:
      return <PromptEditorStep />;
    default:
      return <>Approach not supported</>;
  }
});
