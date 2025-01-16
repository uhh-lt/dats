import SmartToyIcon from "@mui/icons-material/SmartToy";
import { IconButton, Tooltip } from "@mui/material";
import { useOpenLLMDialog } from "./useOpenLLMDialog.ts";

function LLMAssistanceButton({ sdocIds, projectId }: { sdocIds: number[]; projectId: number }) {
  const openLLmDialog = useOpenLLMDialog();

  return (
    <Tooltip title="Open LLM Assistant">
      <IconButton onClick={() => openLLmDialog({ selectedDocumentIds: sdocIds, projectId: projectId })}>
        <SmartToyIcon />
      </IconButton>
    </Tooltip>
  );
}

export default LLMAssistanceButton;
