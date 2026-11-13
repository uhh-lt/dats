import BuildOutlinedIcon from "@mui/icons-material/BuildOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box, ButtonBase, CircularProgress, Collapse, Typography } from "@mui/material";
import { ReactNode, useState } from "react";
import { ShimmerText } from "./ShimmerText";

interface AgentToolGroupProps {
  count: number;
  isRunning: boolean;
  needsApproval: boolean;
  children: ReactNode;
}

/**
 * Several tool calls in a row, collapsed under "N tool calls". The group is
 * open while the calls run or wait for the user's approval.
 */
export function AgentToolGroup({ count, isRunning, needsApproval, children }: AgentToolGroupProps) {
  const [isOpenedByUser, setIsOpenedByUser] = useState(false);
  const isOpen = isRunning || needsApproval || isOpenedByUser;
  const label = `${count} tool calls`;

  return (
    <Box my={1}>
      <ButtonBase
        onClick={() => setIsOpenedByUser(!isOpen)}
        aria-expanded={isOpen}
        sx={{ gap: 0.75, borderRadius: 1, color: "text.secondary", "&:hover": { color: "text.primary" } }}
      >
        {isRunning ? <CircularProgress size={14} /> : <BuildOutlinedIcon fontSize="small" />}
        {isRunning ? (
          <ShimmerText variant="body2">{label}</ShimmerText>
        ) : (
          <Typography variant="body2">{label}</Typography>
        )}
        <ExpandMoreIcon
          fontSize="small"
          sx={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
        />
      </ButtonBase>
      <Collapse in={isOpen} timeout={200}>
        <Box sx={{ mt: 0.5, pl: 1.5, borderLeft: 2, borderColor: "divider" }}>{children}</Box>
      </Collapse>
    </Box>
  );
}
