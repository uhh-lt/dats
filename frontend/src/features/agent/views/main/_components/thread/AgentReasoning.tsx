import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PsychologyOutlinedIcon from "@mui/icons-material/PsychologyOutlined";
import { Box, ButtonBase, Collapse, Typography } from "@mui/material";
import { ReactNode, useState } from "react";
import { ShimmerText } from "./ShimmerText";

interface AgentReasoningProps {
  isStreaming: boolean;
  // epoch milliseconds of the reasoning's first part and its end (once it ended)
  startedAt: number | undefined;
  completedAt: number | undefined;
  children: ReactNode;
}

const reasoningLabel = (startedAt: number | undefined, completedAt: number | undefined) => {
  if (startedAt === undefined || completedAt === undefined) return "Thoughts";
  const seconds = Math.max(1, Math.round((completedAt - startedAt) / 1000));
  return `Thought for ${seconds} s`;
};

/**
 * The model's reasoning, collapsed under a "Thinking…" / "Thought for N s"
 * line. It is open while the model thinks and closes when the answer starts,
 * unless the user opened it.
 */
export function AgentReasoning({ isStreaming, startedAt, completedAt, children }: AgentReasoningProps) {
  const [isOpenedByUser, setIsOpenedByUser] = useState(false);
  const isOpen = isStreaming || isOpenedByUser;

  return (
    <Box my={1}>
      <ButtonBase
        onClick={() => setIsOpenedByUser(!isOpen)}
        aria-expanded={isOpen}
        sx={{ gap: 0.75, borderRadius: 1, color: "text.secondary", "&:hover": { color: "text.primary" } }}
      >
        <PsychologyOutlinedIcon fontSize="small" />
        {isStreaming ? (
          <ShimmerText variant="body2">Thinking…</ShimmerText>
        ) : (
          <Typography variant="body2">{reasoningLabel(startedAt, completedAt)}</Typography>
        )}
        <ExpandMoreIcon
          fontSize="small"
          sx={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 150ms" }}
        />
      </ButtonBase>
      <Collapse in={isOpen} timeout={200}>
        <Box
          aria-busy={isStreaming}
          sx={{
            mt: 0.5,
            pl: 1.5,
            borderLeft: 2,
            borderColor: "divider",
            color: "text.secondary",
            "& .aui-md": { fontSize: "0.875rem" },
          }}
        >
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}
