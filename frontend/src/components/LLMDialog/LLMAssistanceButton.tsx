import { IconButton, Tooltip } from "@mui/material";
import { Icon, getIconComponent } from "../../utils/icons/iconUtils.tsx";
import { useOpenLLMDialog } from "./useOpenLLMDialog.ts";

function LLMAssistanceButton({ sdocIds, projectId }: { sdocIds: number[]; projectId: number }) {
  const openLLmDialog = useOpenLLMDialog();

  return (
    <Tooltip title="Open LLM Assistant">
      <IconButton onClick={() => openLLmDialog({ selectedDocumentIds: sdocIds, projectId: projectId })}>
        {getIconComponent(Icon.LLM_ASSISTANT)}
      </IconButton>
    </Tooltip>
  );
}

export default LLMAssistanceButton;
