import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import MoreHorizOutlinedIcon from "@mui/icons-material/MoreHorizOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import { Box, CircularProgress, LinearProgress, ListItem, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { memo, useMemo } from "react";
import { DocType } from "../../api/openapi/models/DocType.ts";
import { SourceDocumentStatusRead } from "../../api/openapi/models/SourceDocumentStatusRead.ts";
import { docTypeToIcon } from "../../utils/icons/docTypeToIcon.tsx";
import { statusToTypographyColor } from "../BackgroundTasks/StatusToTypographyColor.ts";

interface SdocStatusListItemProps {
  sdocStatus: SourceDocumentStatusRead;
}

function sumSDocStatusValues(sdocStatus: SourceDocumentStatusRead): number {
  const excludeFields = ["filename", "name", "doctype", "project_id"];
  return Object.entries(sdocStatus)
    .filter(([key]) => !excludeFields.includes(key))
    .reduce((sum, [, value]) => sum + (value as number), 0);
}

function SdocStatusListItem({ sdocStatus }: SdocStatusListItemProps) {
  const { processedJobs, totalJobs } = useMemo(() => {
    const processedJobs = sumSDocStatusValues(sdocStatus);
    let totalJobs = -1;
    // TODO: NO HARDCODED MAGIC NUMBERS
    switch (sdocStatus.doctype) {
      case DocType.TEXT:
        totalJobs = 7;
        break;
      case DocType.IMAGE:
        totalJobs = 11;
        break;
      case DocType.AUDIO:
        totalJobs = 9;
        break;
      case DocType.VIDEO:
        totalJobs = 10;
        break;
    }
    return {
      processedJobs,
      totalJobs,
    };
  }, [sdocStatus]);

  console.log(sdocStatus.filename, processedJobs, totalJobs);

  return (
    <ListItem>
      <ListItemIcon>{docTypeToIcon[sdocStatus.doctype]}</ListItemIcon>
      <ListItemText primary={sdocStatus.filename} sx={{ flexShrink: 0 }} />

      <Box width="100%" mx={2}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Box sx={{ width: "100%", mr: 1 }}>
            <LinearProgress variant="determinate" value={(processedJobs / totalJobs) * 100} />
          </Box>
          <Box flexShrink={0}>
            <Typography variant="body2" color="text.secondary">{`${processedJobs}/${totalJobs}`}</Typography>
          </Box>
        </Box>
      </Box>
      <ListItemIcon sx={{ minWidth: "1px" }}>
        {processedJobs == totalJobs ? (
          <TaskAltIcon sx={{ color: statusToTypographyColor.Finished }} />
        ) : processedJobs >= 0 ? (
          <CircularProgress color="secondary" size={24} />
        ) : processedJobs < 0 ? (
          <ErrorOutlineIcon sx={{ color: statusToTypographyColor.Errorneous }} />
        ) : (
          <MoreHorizOutlinedIcon />
        )}
      </ListItemIcon>
    </ListItem>
  );
}

export default memo(SdocStatusListItem);
