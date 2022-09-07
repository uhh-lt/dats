import { IconButton, Stack, Tooltip, Typography } from "@mui/material";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import { useNavigate, useParams } from "react-router-dom";
import { useMemo } from "react";

interface DocumentNavigationProps {
  idsToNavigate: number[];
  searchPrefix: string;
  showText?: boolean;
}

function DocumentNavigation({ idsToNavigate, searchPrefix, showText }: DocumentNavigationProps) {
  // router
  const navigate = useNavigate();
  const { sdocId } = useParams() as { sdocId: string };

  // computed
  const currentDocumentIdx = useMemo(() => {
    return idsToNavigate.indexOf(parseInt(sdocId));
  }, [idsToNavigate, sdocId]);

  // actions
  const hasNextDocument = (): boolean => {
    return currentDocumentIdx !== -1 && currentDocumentIdx <= idsToNavigate.length - 2;
  };
  const hasPrevDocument = () => {
    return currentDocumentIdx !== -1 && currentDocumentIdx > 0;
  };
  const handleNextDocument = () => {
    if (hasNextDocument()) {
      navigate(`${searchPrefix}${idsToNavigate[currentDocumentIdx + 1]}`);
    }
  };
  const handlePrevDocument = () => {
    if (hasPrevDocument()) {
      navigate(`${searchPrefix}${idsToNavigate[currentDocumentIdx - 1]}`);
    }
  };

  return (
    <Stack direction="row" sx={{ alignItems: "center" }}>
      {showText && (
        <Typography>
          {currentDocumentIdx !== -1 ? `${currentDocumentIdx + 1} of ${idsToNavigate.length}` : ""}
        </Typography>
      )}
      <Tooltip title="Previous document">
        <span>
          <IconButton onClick={() => handlePrevDocument()} disabled={!hasPrevDocument()} sx={{ color: "inherit" }}>
            <KeyboardArrowLeft />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Next document">
        <span>
          <IconButton onClick={() => handleNextDocument()} disabled={!hasNextDocument()} sx={{ color: "inherit" }}>
            <KeyboardArrowRight />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}

export default DocumentNavigation;
