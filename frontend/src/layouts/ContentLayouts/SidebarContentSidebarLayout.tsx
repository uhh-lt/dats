import { Box } from "@mui/material";
import { ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { LayoutActions } from "../layoutSlice.ts";
import { ResizablePanel } from "./ResizablePanel.tsx";

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
      <ResizablePanel
        width={leftSidebarWidth}
        onResize={(width) => dispatch(LayoutActions.setLeftSidebarWidth(width))}
        position="left"
      >
        {leftSidebar}
      </ResizablePanel>

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

      <ResizablePanel
        width={rightSidebarWidth}
        onResize={(width) => dispatch(LayoutActions.setRightSidebarWidth(width))}
        position="right"
      >
        {rightSidebar}
      </ResizablePanel>
    </Box>
  );
}

export default SidebarContentSidebarLayout;
