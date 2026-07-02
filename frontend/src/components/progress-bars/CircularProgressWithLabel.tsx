import { Box, CircularProgress, CircularProgressProps, Tooltip, Typography } from "@mui/material";
import { ReactNode } from "react";

interface CircularProgressWithLabelProps extends Omit<CircularProgressProps, "value" | "variant"> {
  current: number;
  max: number;
  tooltip: ReactNode;
}

export function CircularProgressWithLabel({ current, max, tooltip, ...props }: CircularProgressWithLabelProps) {
  const value = max > 0 ? Math.round((current / max) * 100) : 100;

  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      <CircularProgress variant={current === max ? "determinate" : "indeterminate"} {...props} />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: "absolute",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Tooltip title={tooltip}>
          <Typography variant="caption" component="div" color="textSecondary">
            {`${value}%`}
          </Typography>
        </Tooltip>
      </Box>
    </Box>
  );
}
