import { Box } from "@mui/material";
import { ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { LayoutActions } from "../layoutSlice.ts";
import { HorizontalResizablePanel } from "../ResizePanel/HorizontalResizablePanel.tsx";

function SidebarContentSidebarLayout({
  leftSidebar,
  content,
  rightSidebar,
}: {
  leftSidebar: ReactNode;
  content: ReactNode;
  rightSidebar: ReactNode;
}) {
  const leftSidebarWidth = useAppSelector((state) => state.layout.leftSidebarWidth);
  const rightSidebarWidth = useAppSelector((state) => state.layout.rightSidebarWidth);
  const dispatch = useAppDispatch();

  return (
    <Box sx={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
      <HorizontalResizablePanel
        width={leftSidebarWidth}
        onResize={(width) => dispatch(LayoutActions.setLeftSidebarWidth(width))}
        position="left"
      >
        {leftSidebar}
      </HorizontalResizablePanel>

      <Box
        sx={{
          flex: 1,
          minWidth: 0, // This prevents flex child from overflowing
          height: "100%",
          bgcolor: (theme) => theme.palette.grey[200],
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {content}
      </Box>

      <HorizontalResizablePanel
        width={rightSidebarWidth}
        onResize={(width) => dispatch(LayoutActions.setRightSidebarWidth(width))}
        position="right"
      >
        {rightSidebar}
      </HorizontalResizablePanel>
    </Box>
  );
}

export default SidebarContentSidebarLayout;
