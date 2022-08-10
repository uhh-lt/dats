import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

function BackButton(props: IconButtonProps) {
  return (
    <Tooltip title="Back">
      <IconButton {...props}>
        <ArrowBackIcon />
      </IconButton>
    </Tooltip>
  );
}

export default BackButton;
