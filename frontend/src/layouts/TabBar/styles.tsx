import { Box, IconButton, styled, Tab } from "@mui/material";

// Styled components for tabs
export const StyledTab = styled(Tab)(({ theme }) => ({
  minHeight: "42px",
  padding: "8px 8px 10px 8px",
  fontSize: theme.typography.body2.fontSize,
  borderRight: `1px solid ${theme.palette.divider}`,
  borderTop: `1px solid ${theme.palette.divider}`,
  opacity: 0.9,
  textTransform: "none",
  borderTopLeftRadius: "6px",
  borderTopRightRadius: "6px",
  position: "relative",
  overflow: "visible",
  backgroundColor: theme.palette.grey[100],
  "&::before": {
    content: '""',
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    height: "2px",
    backgroundColor: "transparent",
    transition: "background-color 0.2s",
  },
  "&.Mui-selected": {
    opacity: 1,
    backgroundColor: theme.palette.background.default,
    "&::before": {
      backgroundColor: theme.palette.primary.main,
    },
  },
  "& .MuiTab-wrapper": {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  "&:first-of-type": {
    borderLeft: `1px solid ${theme.palette.divider}`,
  },
}));

// Tab wrapper styling
export const TabWrapper = styled("div")(({ theme }) => ({
  display: "flex",
  position: "relative",
  cursor: "grab",

  // Hover styling
  "&:hover": {
    "& .MuiTab-root::before": {
      backgroundColor: theme.palette.grey[600],
    },
    "& .MuiTab-root": {
      opacity: 1,
    },
  },
  // Active tab styling
  "&.active-tab": {
    "& .MuiTab-root": {
      opacity: 1,
      backgroundColor: theme.palette.background.default,
      "&::before": {
        backgroundColor: theme.palette.primary.main,
      },
    },
  },
  // Dragging tab styling
  "&.dragging": {
    boxShadow: "0 5px 10px rgba(0,0,0,0.2)",
    opacity: 0.9,
    cursor: "grabbing",
    zIndex: 10000,
  },
}));

// Scroll button styling
export const ScrollButton = styled(IconButton)(({ theme }) => ({
  width: "48px",
  height: "48px",
  borderRadius: 0,
  color: theme.palette.common.white,
  "&.Mui-disabled": {
    color: theme.palette.grey[400],
  },
  zIndex: 2,
}));

// Close button styling
export const CloseButton = styled(IconButton)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  opacity: 0.5,
  "&:hover": {
    opacity: 1,
  },
  padding: "2px",
  height: 18,
  width: 18,
  pointerEvents: "auto",
}));

// Container for the tab content
export const TabContent = styled(Box)({
  display: "flex",
  alignItems: "center",
  width: "100%",
  justifyContent: "space-between",
  pointerEvents: "none",
});

// Container for the tab label and icon
export const TabLabel = styled(Box)({
  display: "flex",
  alignItems: "center",
});

// Label text styling
export const LabelText = styled("span")({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  marginLeft: "8px",
});
