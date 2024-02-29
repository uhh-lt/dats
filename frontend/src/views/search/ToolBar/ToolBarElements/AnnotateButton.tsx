import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import { Link } from "react-router-dom";
import BorderColorIcon from "@mui/icons-material/BorderColor";

interface AnnotateButtonProps {
  projectId: number | string;
  sdocId: number | string;
}

function AnnotateButton({ projectId, sdocId }: AnnotateButtonProps) {
  return (
    <Tooltip title="Annotate">
      <IconButton
        component={Link}
        to={`/project/${projectId}/annotation/${sdocId}`}
        onClick={(e) => e.stopPropagation()}
      >
        <BorderColorIcon />
      </IconButton>
    </Tooltip>
  );
}

export default AnnotateButton;
