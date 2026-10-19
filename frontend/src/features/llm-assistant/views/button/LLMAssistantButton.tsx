import { Icon, getIconComponent } from "@components/icons";
import { IconButton, Tooltip } from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { memo, useCallback } from "react";
import { LLMAssistantEvent } from "../../_types/LLMAssistantEvent";
import { LLMAssistantActions } from "../../store/llmAssistantSlice";

export const LLMAssistantButton = memo(({ sdocIds, projectId }: { sdocIds: number[]; projectId: number }) => {
  const dispatch = useAppDispatch();

  const openLLMAssistantDialog = useCallback(
    (event: LLMAssistantEvent) => {
      dispatch(LLMAssistantActions.openDialog(event));
    },
    [dispatch],
  );

  const handleClick = useCallback(() => {
    openLLMAssistantDialog({ selectedDocumentIds: sdocIds, projectId: projectId });
  }, [openLLMAssistantDialog, sdocIds, projectId]);

  return (
    <Tooltip title="Open LLM Assistant">
      <IconButton onClick={handleClick}>{getIconComponent(Icon.LLM_ASSISTANT)}</IconButton>
    </Tooltip>
  );
});
