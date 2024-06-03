import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  CircularProgress,
  Collapse,
  Grid,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import React from "react";
import { BackgroundJobStatus } from "../../../../api/openapi/models/BackgroundJobStatus.ts";
import { PreprocessingJobPayloadRead } from "../../../../api/openapi/models/PreprocessingJobPayloadRead.ts";
import { docTypeToIcon } from "../../../../utils/docTypeToIcon.tsx";
import { statusToTypographyColor } from "./StatusToTypographyColor.ts";

interface PreProJobPayloadListItemProps {
  ppj: PreprocessingJobPayloadRead;
}

function PreProJobPayloadListItem({ ppj }: PreProJobPayloadListItemProps) {
  // local state
  const [expanded, setExpanded] = React.useState(false);
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

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
            <Typography variant="body2" color="text.secondary">
              {ppj.filename}
            </Typography>
          </ListItemText>
          {expanded ? <ExpandLess /> : <ExpandMoreIcon />}
        </ListItemButton>
      </Tooltip>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Grid container rowSpacing={2} columnSpacing={1} paddingLeft={15.5}>
          <Grid item md={3}>
            <Stack direction="row" sx={{ alignItems: "center" }}>
              <InfoOutlinedIcon fontSize="small" color="info" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
            </Stack>
          </Grid>
          <Grid item md={9}>
            <Typography variant="body2" color={`${statusToTypographyColor[ppj.status!]}`}>
              {ppj.status}
            </Typography>
          </Grid>

          {ppj.current_pipeline_step && (
            <>
              <Grid item md={3}>
                <Stack direction="row" sx={{ alignItems: "center" }}>
                  <InfoOutlinedIcon fontSize="small" color="info" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Current Pipeline Step
                  </Typography>
                </Stack>
              </Grid>
              <Grid item md={9}>
                <Typography variant="body2" color="text.secondary">
                  {ppj.current_pipeline_step}
                </Typography>
              </Grid>
            </>
          )}

          {ppj.status === BackgroundJobStatus.ERRORNEOUS && (
            <>
              <Grid item md={3}>
                <Stack direction="row" sx={{ alignItems: "center" }}>
                  <InfoOutlinedIcon fontSize="small" color="info" sx={{ mr: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    Error Message
                  </Typography>
                </Stack>
              </Grid>
              <Grid item md={9}>
                <Typography variant="body2" color="text.secondary">
                  {ppj.error_message}
                </Typography>
              </Grid>
            </>
          )}

          <Grid item md={3}>
            <Stack direction="row" sx={{ alignItems: "center" }}>
              <InfoOutlinedIcon fontSize="small" color="info" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                MIME Type
              </Typography>
            </Stack>
          </Grid>
          <Grid item md={9}>
            <Typography variant="body2" color="text.secondary">
              {ppj.mime_type}
            </Typography>
          </Grid>

          <Grid item md={3}>
            <Stack direction="row" sx={{ alignItems: "center" }}>
              <InfoOutlinedIcon fontSize="small" color="info" sx={{ mr: 1 }} />
              <Typography variant="body2" color="text.secondary">
                DocType
              </Typography>
            </Stack>
          </Grid>
          <Grid item md={9}>
            <Typography variant="body2" color="text.secondary">
              {ppj.doc_type}
            </Typography>
          </Grid>
        </Grid>
      </Collapse>
    </>
  );
}

export default PreProJobPayloadListItem;
