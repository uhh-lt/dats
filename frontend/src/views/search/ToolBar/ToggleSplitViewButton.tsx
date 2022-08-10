import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import VerticalSplitIcon from "@mui/icons-material/VerticalSplit";
import ReorderIcon from "@mui/icons-material/Reorder";

interface ToggleSplitViewButtonProps {
  isSplitView: boolean;
}

function ToggleSplitViewButton({ isSplitView, ...props }: ToggleSplitViewButtonProps & IconButtonProps) {
  return (
    <Tooltip title="Fenster teilen/nicht teilen">
      <IconButton {...props}>{isSplitView ? <ReorderIcon /> : <VerticalSplitIcon />}</IconButton>
    </Tooltip>
  );
}

export default ToggleSplitViewButton;
