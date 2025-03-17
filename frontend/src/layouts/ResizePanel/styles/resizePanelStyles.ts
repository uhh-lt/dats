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
          width: "2px",
          transform: "translateX(-50%)",
        }
      : {
          left: 0,
          right: 0,
          top: "50%",
          height: "2px",
          transform: "translateY(-50%)",
        }),
    bgcolor: isAnyCollapsed ? "primary.main" : isDragging ? "primary.main" : "primary.dark",
    opacity: isAnyCollapsed ? 0.5 : isDragging ? 1 : 1,
    transition: "opacity 0.2s, background-color 0.2s",
  },
});

export const createContainerStyles = (isHorizontal = true): SxProps<Theme> => ({
  display: "flex",
  flexDirection: isHorizontal ? "row" : "column",
  width: "100%",
  height: "100%",
  position: "relative",
  bgcolor: "background.paper",
});

export const createPanelStyles = (
  size: string | number,
  isCollapsed: boolean,
  isDragging: boolean,
  isHorizontal = true,
): SxProps<Theme> => ({
  ...(isHorizontal
    ? {
        width: size,
        height: "100%",
      }
    : {
        width: "100%",
        height: size,
      }),
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  transition: isDragging ? undefined : `${isHorizontal ? "width" : "height"} 0.15s ease-out`,
  visibility: isCollapsed ? "collapse" : "visible",
  flex: isCollapsed ? "0 0 0" : "1 1 auto",
});
