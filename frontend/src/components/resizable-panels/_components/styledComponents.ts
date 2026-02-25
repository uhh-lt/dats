import { Box, styled } from "@mui/material";

export const Container = styled(Box, {
  shouldForwardProp: (prop) => prop !== "isHorizontal",
})<{ isHorizontal: boolean }>(({ isHorizontal }) => ({
  display: "flex",
  flexDirection: isHorizontal ? "row" : "column",
  width: "100%",
  height: "100%",
  position: "relative",
}));

export const Panel = styled(Box, {
  shouldForwardProp: (prop) => prop !== "size" && prop !== "isHorizontal",
})<{
  size: string | number;
  isHorizontal: boolean;
}>(({ size, isHorizontal }) => ({
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
  flex: "1 1 auto",
}));

export const StyledDragHandler = styled(Box, {
  shouldForwardProp: (prop) => !["isDragging", "isCollapsed", "isHorizontal"].includes(prop as string),
})<{
  isDragging: boolean;
  isCollapsed: boolean;
  isHorizontal: boolean;
}>(({ theme, isDragging, isCollapsed, isHorizontal }) => ({
  position: "absolute",
  cursor: isHorizontal ? "ew-resize" : "ns-resize",
  zIndex: 1102,
  userSelect: "none",
  touchAction: "none",
  backgroundColor: isDragging ? "rgba(0, 120, 215, 0.25)" : "transparent",
  ...(isHorizontal
    ? {
        width: 8,
        height: "100%",
      }
    : {
        height: 8,
        width: "100%",
      }),

  "&::after": {
    content: '""',
    position: "absolute",
    ...(isHorizontal
      ? {
          top: 0,
          bottom: 0,
          left: "50%",
          width: isCollapsed ? "8px" : "2px",
          transform: "translateX(-50%)",
        }
      : {
          left: 0,
          right: 0,
          top: "50%",
          height: isCollapsed ? "8px" : "2px",
          transform: "translateY(-50%)",
        }),
    backgroundColor: isCollapsed
      ? theme.palette.primary.main
      : isDragging
        ? theme.palette.primary.main
        : theme.palette.primary.dark,
    opacity: isCollapsed ? 0.5 : isDragging ? 1 : 1,
    transition: "opacity 0.2s, background-color 0.2s",
  },

  "&:hover::after": {
    backgroundColor: isDragging ? theme.palette.primary.main : theme.palette.primary.light,
    opacity: isDragging ? 1 : 0.8,
  },

  // Additional styles for collapsed state
  ...(isCollapsed && {
    "&::after": {
      content: '""',
      position: "absolute",
      backgroundColor: theme.palette.action.active,
      transition: "all 0.2s ease",
      opacity: 0.5,
      ...(isHorizontal
        ? {
            width: "4px",
            height: "32px",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }
        : {
            width: "32px",
            height: "4px",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }),
    },
    "&:hover::after": {
      opacity: 1,
      ...(isHorizontal
        ? {
            height: "48px",
          }
        : {
            width: "48px",
          }),
    },
  }),
}));
