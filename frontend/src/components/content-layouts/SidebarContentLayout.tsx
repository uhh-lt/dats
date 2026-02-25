import { Box } from "@mui/material";
import { ReactNode, memo } from "react";
import { PixelResizablePanel } from "../resizable-panels/PixelResizablePanel";
import { useLayoutSize } from "../resizable-panels/useLayoutSize";

export const SidebarContentLayout = memo(
  ({ sidebar: leftSidebar, content }: { sidebar: ReactNode; content: ReactNode }) => {
    const { size, handleResize } = useLayoutSize("sidebar-content-layout");

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
  },
);
