import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, Collapse, IconButton, Paper, Stack, Tooltip } from "@mui/material";
import { ReactNode, useState } from "react";

export interface ExpandableRendererProps {
  expandable?: boolean;
  expandMaxHeight?: number | string;
  expandButtonPosition?: "start" | "end";
}

interface ExpandableRendererComponentProps extends ExpandableRendererProps {
  children: ReactNode;
  expandedContent: ReactNode;
}

export function ExpandableRenderer({
  children,
  expandedContent,
  expandable = false,
  expandMaxHeight = 240,
  expandButtonPosition = "end",
}: ExpandableRendererComponentProps) {
  const [expanded, setExpanded] = useState(false);

  if (!expandable) {
    return children;
  }

  const handleToggleExpanded = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setExpanded((current) => !current);
  };

  const expandButton = (
    <Tooltip title={expanded ? "Collapse context" : "Expand context"}>
      <IconButton size="small" onClick={handleToggleExpanded} sx={{ flexShrink: 0, width: 24, height: 24, p: 0 }}>
        <ExpandMoreIcon
          fontSize="small"
          sx={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }}
        />
      </IconButton>
    </Tooltip>
  );

  return (
    <Box sx={{ minWidth: 0, maxWidth: "100%" }}>
      <Stack direction="row" alignItems="center" minWidth={0} maxWidth="100%">
        {expandButtonPosition === "start" ? expandButton : null}
        <Box sx={{ flex: "1 1 auto", minWidth: 0, maxWidth: "100%", overflow: "hidden" }}>{children}</Box>
        {expandButtonPosition === "end" ? expandButton : null}
      </Stack>
      <Collapse in={expanded} unmountOnExit>
        <Paper
          variant="outlined"
          sx={{ mt: 1, p: 1.5, maxHeight: expandMaxHeight, overflowY: "auto", overflowX: "hidden" }}
        >
          {expandedContent}
        </Paper>
      </Collapse>
    </Box>
  );
}
