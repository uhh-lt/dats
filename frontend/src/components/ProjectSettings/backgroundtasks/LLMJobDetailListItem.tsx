import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Collapse, ListItemButton, ListItemText, Tooltip, Typography } from "@mui/material";
import React from "react";

interface LLMJobdetailListItemProps {
  detailKey: string;
  detailValue: string;
}

function LLMJobDetailListItem({ detailKey, detailValue }: LLMJobdetailListItemProps) {
  // local state
  const [expanded, setExpanded] = React.useState(false);
  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  return (
    <>
      <Tooltip title="Click to view details" followCursor={true} enterDelay={1000}>
        <ListItemButton onClick={handleExpandClick}>
          <ListItemText>
            <Typography variant="body2" color="text.secondary">
              {detailKey}
            </Typography>
          </ListItemText>
          {expanded ? <ExpandLess /> : <ExpandMoreIcon />}
        </ListItemButton>
      </Tooltip>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <Typography pl={3} variant="body2" color="text.primary">
          {detailValue}
        </Typography>
      </Collapse>
    </>
  );
}

export default LLMJobDetailListItem;
