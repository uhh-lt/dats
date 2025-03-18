import { SxProps, Theme } from "@mui/material";

export const createDividerStyles = (
  isDragging: boolean,
  isAnyCollapsed: boolean,
  isHorizontal = true,
): SxProps<Theme> => ({
  position: "absolute",
  cursor: isHorizontal ? "ew-resize" : "ns-resize",
  zIndex: 1102,
  ...(isHorizontal
    ? {
        width: 8,
        height: "100%",
      }
    : {
        height: 8,
        width: "100%",
      }),
  "&:hover": {
    "&::after": {
      bgcolor: isDragging ? "primary.main" : "primary.light",
      opacity: isDragging ? 1 : 0.8,
    },
  },
  "&::after": {
    content: '""',
    position: "absolute",
    ...(isHorizontal
      ? {
          top: 0,
          bottom: 0,
          left: "50%",
          width: isAnyCollapsed ? "8px" : "2px",
          transform: "translateX(-50%)",
        }
      : {
          left: 0,
          right: 0,
          top: "50%",
          height: isAnyCollapsed ? "8px" : "2px",
          transform: "translateY(-50%)",
        }),
    bgcolor: isAnyCollapsed ? "primary.main" : isDragging ? "primary.main" : "primary.dark",
    opacity: isAnyCollapsed ? 0.5 : isDragging ? 1 : 1,
    transition: "opacity 0.2s, background-color 0.2s",
  },
});
