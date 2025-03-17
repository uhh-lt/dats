import { Box } from "@mui/material";
import { ReactNode, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { LayoutActions } from "../layoutSlice.ts";
import { PixelResizablePanel } from "../ResizePanel/PixelResizablePanel.tsx";

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

  const handleLeftSidebarResize = useCallback(
    (newSize: number) => {
      dispatch(LayoutActions.setLeftSidebarWidth(newSize));
    },
    [dispatch],
  );

  const handleRightSidebarResize = useCallback(
    (newSize: number) => {
      dispatch(LayoutActions.setRightSidebarWidth(newSize));
    },
    [dispatch],
  );

  return (
    <Box sx={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
      <PixelResizablePanel size={leftSidebarWidth} onResize={handleLeftSidebarResize} position="left" isHorizontal>
        {leftSidebar}
      </PixelResizablePanel>

      <Box
        sx={{
          flex: 1,
          minWidth: 0, // This prevents flex child from overflowing
          height: "100%",
          overflowY: "auto",
          overflowX: "hidden",
        }}
      >
        {content}
      </Box>

      <PixelResizablePanel size={rightSidebarWidth} onResize={handleRightSidebarResize} position="right" isHorizontal>
        {rightSidebar}
      </PixelResizablePanel>
    </Box>
  );
}

export default SidebarContentSidebarLayout;
