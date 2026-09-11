import { Box, Tooltip, Typography } from "@mui/material";
import { WebSocketConnectionStatus } from "@store/global/websocketSlice";
import { useAppSelector } from "@store/storeHooks";

const STATUS_CONFIG: Record<WebSocketConnectionStatus, { color: string; label: string }> = {
  connected: { color: "success.main", label: "Connected" },
  connecting: { color: "warning.main", label: "Connecting" },
  disconnected: { color: "error.main", label: "Disconnected" },
};

interface WebSocketStatusIndicatorProps {
  isExpanded: boolean;
}

export function WebSocketStatusIndicator({ isExpanded }: WebSocketStatusIndicatorProps) {
  const status = useAppSelector((state) => state.websocket.status);
  const { color, label } = STATUS_CONFIG[status];

  return (
    <Tooltip title={label} placement="right" arrow disableHoverListener={isExpanded}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          py: 0.5,
        }}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: color,
            flexShrink: 0,
            outline: "1.5px solid",
            outlineColor: "common.white",
          }}
        />
        {isExpanded && (
          <Typography sx={{ fontSize: "0.75rem", color: "primary.contrastText", lineHeight: 1 }}>{label}</Typography>
        )}
      </Box>
    </Tooltip>
  );
}
