import SaveAltIcon from "@mui/icons-material/SaveAlt";
import { IconButton, Tooltip } from "@mui/material";
import SATToolbar, { SATToolbarProps } from "../../../components/SpanAnnotation/SpanAnnotationTable/SATToolbar.tsx";

function AnnotatedSegmentsTableToolbar(props: SATToolbarProps) {
  return (
    <SATToolbar
      {...props}
      rightChildren={
        <Tooltip title={"Export segments"}>
          <span>
            <IconButton disabled>
              <SaveAltIcon />
            </IconButton>
          </span>
        </Tooltip>
      }
    />
  );
}

export default AnnotatedSegmentsTableToolbar;
