import SaveAltIcon from "@mui/icons-material/SaveAlt";
import { IconButton } from "@mui/material";
import { useCallback } from "react";
import ExporterAPI from "./ExporterAPI";

function ExporterButton() {
  const handleClick = useCallback(() => {
    ExporterAPI.openExporterDialog({ test: 1 });
  }, []);

  return (
    <IconButton onClick={handleClick}>
      <SaveAltIcon />
    </IconButton>
  );
}

export default ExporterButton;
