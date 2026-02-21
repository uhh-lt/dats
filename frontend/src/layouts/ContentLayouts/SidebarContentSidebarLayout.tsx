import { Box } from "@mui/material";
import { ReactNode, memo } from "react";
import { LayoutSizeKeys } from "../layoutSlice.ts";
import { useLayoutSize } from "../ResizePanel/hooks/useLayoutSize.ts";
import { PixelResizablePanel } from "../ResizePanel/PixelResizablePanel.tsx";

export const SidebarContentSidebarLayout = memo((
  {
    leftSidebar,
    content,
    rightSidebar,
  }: {
    leftSidebar: ReactNode;
    content: ReactNode;
    rightSidebar: ReactNode;
  }
) => {
  const { size: leftSize, handleResize: handleLeftResize } = useLayoutSize(
    LayoutSizeKeys.SidebarContentSidebarLayoutLeft,
  );
  const { size: rightSize, handleResize: handleRightResize } = useLayoutSize(
    LayoutSizeKeys.SidebarContentSidebarLayoutRight,
  );

  return (
    <Box sx={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
      <PixelResizablePanel size={leftSize} onResize={handleLeftResize} position="left" isHorizontal>
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

      <PixelResizablePanel size={rightSize} onResize={handleRightResize} position="right" isHorizontal>
        {rightSidebar}
      </PixelResizablePanel>
    </Box>
  );
});
