import { PixelResizablePanel, useLayoutSize } from "@components/resizable-panels";
import { Box } from "@mui/material";
import { ReactNode, memo } from "react";

interface SidebarContentLayoutProps {
  sidebar: ReactNode;
  content: ReactNode;
  /** Key used to persist the sidebar width. Defaults to "sidebar-content-layout". */
  layoutKey?: string;
}

export const SidebarContentLayout = memo(
  ({ sidebar: leftSidebar, content, layoutKey = "sidebar-content-layout" }: SidebarContentLayoutProps) => {
    const { size, handleResize } = useLayoutSize(layoutKey);

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
