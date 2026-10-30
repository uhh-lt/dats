import { Box, Stack, Typography } from "@mui/material";
import { memo } from "react";

interface AgentToolArgumentsProps {
  argsText: string;
}

const parseArguments = (argsText: string): Record<string, unknown> | undefined => {
  try {
    const parsed: unknown = JSON.parse(argsText || "{}");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return undefined;
    return Object.fromEntries(Object.entries(parsed));
  } catch {
    // the arguments are still streaming
    return undefined;
  }
};

const formatValue = (value: unknown) => (typeof value === "string" ? value : JSON.stringify(value));

/** The arguments of a tool call as "name: value" lines (the raw text while they stream). */
export const AgentToolArguments = memo(({ argsText }: AgentToolArgumentsProps) => {
  const args = parseArguments(argsText);
  if (args === undefined) {
    return (
      <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: "break-all" }}>
        {argsText}
      </Typography>
    );
  }
  if (Object.keys(args).length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No arguments
      </Typography>
    );
  }
  return (
    <Stack spacing={0.25}>
      {Object.entries(args).map(([name, value]) => (
        <Stack key={name} direction="row" spacing={1} alignItems="baseline">
          <Typography variant="body2" color="text.secondary" fontFamily="monospace" flexShrink={0}>
            {name}:
          </Typography>
          <Box sx={{ minWidth: 0, overflowWrap: "anywhere" }}>
            <Typography variant="body2" fontFamily="monospace">
              {formatValue(value)}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  );
});
