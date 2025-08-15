import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { Box, CircularProgress, LinearProgress, ListItem, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { memo } from "react";
import { SDocStatus } from "../../api/openapi/models/SDocStatus.ts";
import { SourceDocumentStatusSimple } from "../../api/openapi/models/SourceDocumentStatusSimple.ts";
import { docTypeToIcon } from "../../utils/icons/docTypeToIcon.tsx";
import { statusToTypographyColor } from "../BackgroundTasks/StatusToTypographyColor.ts";

interface SdocStatusSimpleListItemProps {
  sdocStatus: SourceDocumentStatusSimple;
}

function SdocStatusSimpleListItem({ sdocStatus }: SdocStatusSimpleListItemProps) {
  return (
    <ListItem>
      <Box width="50%" display="flex" alignItems="center">
        <ListItemIcon>{docTypeToIcon[sdocStatus.doctype]}</ListItemIcon>
        <ListItemText primary={sdocStatus.filename} />
      </Box>
      <Box width="50%">
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Box sx={{ width: "100%", mr: 1 }}>
            <LinearProgress variant="determinate" value={(sdocStatus.processed_jobs / sdocStatus.total_jobs) * 100} />
          </Box>
          <Box flexShrink={0} mr={2}>
            <Typography
              variant="body2"
              color="text.secondary"
            >{`${sdocStatus.processed_jobs}/${sdocStatus.total_jobs}`}</Typography>
          </Box>
          <ListItemIcon sx={{ minWidth: "1px" }}>
            {sdocStatus.processed_status === SDocStatus._1 ? (
              <TaskAltIcon sx={{ color: statusToTypographyColor.Finished }} />
            ) : sdocStatus.processed_status === SDocStatus._0 ? (
              <CircularProgress color="secondary" size={24} />
            ) : (
              <ErrorOutlineIcon sx={{ color: statusToTypographyColor.Errorneous }} />
            )}
          </ListItemIcon>
        </Box>
      </Box>
    </ListItem>
  );
}

export default memo(SdocStatusSimpleListItem);
