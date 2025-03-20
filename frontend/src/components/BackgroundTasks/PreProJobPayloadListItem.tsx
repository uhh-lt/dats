import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  CircularProgress,
  Collapse,
  Grid2,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { memo, useCallback, useState } from "react";
import { BackgroundJobStatus } from "../../api/openapi/models/BackgroundJobStatus.ts";
import { PreprocessingJobPayloadRead } from "../../api/openapi/models/PreprocessingJobPayloadRead.ts";
import { docTypeToIcon } from "../../utils/icons/docTypeToIcon.tsx";
import { statusToTypographyColor } from "./StatusToTypographyColor.ts";

interface PreProJobPayloadListItemProps {
  ppj: PreprocessingJobPayloadRead;
}

function PreProJobPayloadListItem({ ppj }: PreProJobPayloadListItemProps) {
  // local state
  const [expanded, setExpanded] = useState(false);

  const handleExpandClick = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  return (
    <>
      <Tooltip title="Click to view details" followCursor={true} enterDelay={1000}>
        <ListItemButton sx={{ pl: 8 }} onClick={handleExpandClick}>
          <ListItemIcon sx={{ color: `${statusToTypographyColor[ppj.status!]}` }}>
            {ppj.status === BackgroundJobStatus.RUNNING ? (
              <CircularProgress color="secondary" size={"1.5em"} />
            ) : (
              docTypeToIcon[ppj.doc_type]
            )}
          </ListItemIcon>
          <ListItemText>
            <Typography variant="body2" color="textSecondary">
              {ppj.filename}
            </Typography>
          </ListItemText>
          {expanded ? <ExpandLess /> : <ExpandMoreIcon />}
        </ListItemButton>
      </Tooltip>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Grid2 container rowSpacing={2} columnSpacing={1} paddingLeft={15.5}>
          <Grid2 size={{ md: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center" }}>
              <InfoOutlinedIcon fontSize="small" color="info" sx={{ mr: 1 }} />
              <Typography variant="body2" color="textSecondary">
                Status
              </Typography>
            </Stack>
          </Grid2>
          <Grid2 size={{ md: 9 }}>
            <Typography variant="body2" color={`${statusToTypographyColor[ppj.status!]}`}>
              {ppj.status}
            </Typography>
          </Grid2>

          {ppj.current_pipeline_step && (
            <>
              <Grid2 size={{ md: 3 }}>
                <Stack direction="row" sx={{ alignItems: "center" }}>
                  <InfoOutlinedIcon fontSize="small" color="info" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="textSecondary">
                    Current Pipeline Step
                  </Typography>
                </Stack>
              </Grid2>
              <Grid2 size={{ md: 9 }}>
                <Typography variant="body2" color="textSecondary">
                  {ppj.current_pipeline_step}
                </Typography>
              </Grid2>
            </>
          )}

          {ppj.status === BackgroundJobStatus.ERRORNEOUS && (
            <>
              <Grid2 size={{ md: 3 }}>
                <Stack direction="row" sx={{ alignItems: "center" }}>
                  <InfoOutlinedIcon fontSize="small" color="info" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="textSecondary">
                    Error Message
                  </Typography>
                </Stack>
              </Grid2>
              <Grid2 size={{ md: 9 }}>
                <Typography variant="body2" color="textSecondary">
                  {ppj.error_message}
                </Typography>
              </Grid2>
            </>
          )}

          <Grid2 size={{ md: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center" }}>
              <InfoOutlinedIcon fontSize="small" color="info" sx={{ mr: 1 }} />
              <Typography variant="body2" color="textSecondary">
                MIME Type
              </Typography>
            </Stack>
          </Grid2>
          <Grid2 size={{ md: 9 }}>
            <Typography variant="body2" color="textSecondary">
              {ppj.mime_type}
            </Typography>
          </Grid2>

          <Grid2 size={{ md: 3 }}>
            <Stack direction="row" sx={{ alignItems: "center" }}>
              <InfoOutlinedIcon fontSize="small" color="info" sx={{ mr: 1 }} />
              <Typography variant="body2" color="textSecondary">
                DocType
              </Typography>
            </Stack>
          </Grid2>
          <Grid2 size={{ md: 9 }}>
            <Typography variant="body2" color="textSecondary">
              {ppj.doc_type}
            </Typography>
          </Grid2>
        </Grid2>
      </Collapse>
    </>
  );
}

export default memo(PreProJobPayloadListItem);
