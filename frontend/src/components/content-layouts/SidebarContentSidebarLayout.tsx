import { Box } from "@mui/material";
import { ReactNode, memo } from "react";
import { PixelResizablePanel } from "../resizable-panels/PixelResizablePanel";
import { useLayoutSize } from "../resizable-panels/useLayoutSize";

export const SidebarContentSidebarLayout = memo(
  ({ leftSidebar, content, rightSidebar }: { leftSidebar: ReactNode; content: ReactNode; rightSidebar: ReactNode }) => {
    const { size: leftSize, handleResize: handleLeftResize } = useLayoutSize("sidebar-content-sidebar-layout-left");
    const { size: rightSize, handleResize: handleRightResize } = useLayoutSize("sidebar-content-sidebar-layout-right");

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
  },
);
