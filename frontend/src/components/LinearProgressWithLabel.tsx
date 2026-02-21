import { Box, LinearProgress, LinearProgressProps, Tooltip } from "@mui/material";
import { CircularProgressWithLabel } from "./CircularProgressWithLabel.tsx";

interface LinearProgressWithLabelProps extends Omit<LinearProgressProps, "value"> {
  current: number;
  max: number;
  tooltip: React.ReactNode;
}

export function LinearProgressWithLabel({ current, max, tooltip, ...props }: LinearProgressWithLabelProps) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", px: 3 }}>
      <Box sx={{ width: "100%", mr: 1 }}>
        <Tooltip title={tooltip} followCursor>
          <LinearProgress
            style={{ height: 6, borderRadius: 5, ...props.style }}
            value={(current / max) * 100}
            {...props}
          />
        </Tooltip>
      </Box>
      <CircularProgressWithLabel current={current} max={max} tooltip={`${current} / ${max}`} />
    </Box>
  );
}
