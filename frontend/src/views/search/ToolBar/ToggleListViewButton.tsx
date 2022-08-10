import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import VerticalSplitIcon from "@mui/icons-material/VerticalSplit";
import ReorderIcon from "@mui/icons-material/Reorder";

interface ToggleListViewButtonProps {
  showList: boolean;
}

function ToggleListViewButton({ showList, ...props }: ToggleListViewButtonProps & IconButtonProps) {
  return (
    <Tooltip title="Listenansicht/Kachelansicht">
      <IconButton {...props}>{showList ? <ReorderIcon /> : <VerticalSplitIcon />}</IconButton>
    </Tooltip>
  );
}

export default ToggleListViewButton;
