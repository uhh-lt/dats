import { Box, CircularProgress, CircularProgressProps, Tooltip, Typography } from "@mui/material";
import { ReactNode } from "react";

interface CircularProgressWithLabelProps extends Omit<CircularProgressProps, "value" | "variant"> {
  current: number;
  max: number;
  tooltip: ReactNode;
  failed?: boolean;
}

export function CircularProgressWithLabel({ current, max, tooltip, failed, ...props }: CircularProgressWithLabelProps) {
  const value = failed ? 100 : max > 0 ? Math.round((current / max) * 100) : 100;

  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      <CircularProgress
        // a failed job must not keep spinning; show a static, full ring instead
        variant={failed || current === max ? "determinate" : "indeterminate"}
        value={failed ? 100 : undefined}
        color={failed ? "error" : "primary"}
        {...props}
      />
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
