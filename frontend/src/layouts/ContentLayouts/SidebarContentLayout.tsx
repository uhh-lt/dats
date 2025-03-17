import { Box } from "@mui/material";
import { ReactNode, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks.ts";
import { LayoutActions } from "../layoutSlice.ts";
import { PixelResizablePanel } from "../ResizePanel/PixelResizablePanel.tsx";

function SidebarContentLayout({ leftSidebar, content }: { leftSidebar: ReactNode; content: ReactNode }) {
  const leftSidebarWidth = useAppSelector((state) => state.layout.leftSidebarWidth);
  const dispatch = useAppDispatch();

  const handleResize = useCallback(
    (width: number) => {
      dispatch(LayoutActions.setLeftSidebarWidth(width));
    },
    [dispatch],
  );

  return (
    <Box sx={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
      <PixelResizablePanel size={leftSidebarWidth} onResize={handleResize} position="left" isHorizontal>
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

export default SidebarContentLayout;
