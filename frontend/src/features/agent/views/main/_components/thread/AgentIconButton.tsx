import { IconButton, Tooltip } from "@mui/material";
import { ComponentProps } from "react";

type AgentIconButtonProps = ComponentProps<typeof IconButton> & {
  tooltip: string;
};

/**
 * A small icon button with a tooltip. The assistant-ui primitives render into
 * it (`render={<AgentIconButton tooltip="Copy" />}`) and pass their click
 * handler, disabled state and ref through to the button.
 */
export function AgentIconButton({ tooltip, ...props }: AgentIconButtonProps) {
  return (
    <Tooltip title={tooltip}>
      {/* the span keeps the tooltip working while the button is disabled */}
      <span>
        <IconButton size="small" aria-label={tooltip} {...props} />
      </span>
    </Tooltip>
  );
}
