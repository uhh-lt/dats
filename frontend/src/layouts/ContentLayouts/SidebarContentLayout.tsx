import { Box } from "@mui/material";
import { ReactNode, memo } from "react";
import { LayoutSizeKeys } from "../layoutSlice.ts";
import { useLayoutSize } from "../ResizePanel/hooks/useLayoutSize.ts";
import { PixelResizablePanel } from "../ResizePanel/PixelResizablePanel.tsx";

export const SidebarContentLayout = memo(
  ({ leftSidebar, content }: { leftSidebar: ReactNode; content: ReactNode }) => {
    const { size, handleResize } = useLayoutSize(LayoutSizeKeys.SidebarContentLayoutLeft);

    return (
      <Box sx={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
        <PixelResizablePanel size={size} onResize={handleResize} position="left" isHorizontal>
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
      </Box>
    );
  }
);
