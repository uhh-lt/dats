import { IconButton, Tooltip } from "@mui/material";
import { memo, useCallback } from "react";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import { useOpenLLMDialog } from "./useOpenLLMDialog.ts";

export const LLMAssistanceButton = memo(({ sdocIds, projectId }: { sdocIds: number[]; projectId: number }) => {
  const openLLmDialog = useOpenLLMDialog();

  const handleClick = useCallback(() => {
    openLLmDialog({ selectedDocumentIds: sdocIds, projectId: projectId });
  }, [openLLmDialog, sdocIds, projectId]);

  return (
    <Tooltip title="Open LLM Assistant">
      <IconButton onClick={handleClick}>{getIconComponent(Icon.LLM_ASSISTANT)}</IconButton>
    </Tooltip>
  );
});
