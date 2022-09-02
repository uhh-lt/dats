import { IconButton, IconButtonProps, Tooltip } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useLocation, useNavigate } from "react-router-dom";

function BackButton(props: IconButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // ui event handlers
  const handleClick = () => {
    navigate(location.pathname.split("/doc")[0]);
  };

  return (
    <Tooltip title="Back">
      <IconButton onClick={handleClick} {...props}>
        <ArrowBackIcon />
      </IconButton>
    </Tooltip>
  );
}

export default BackButton;
