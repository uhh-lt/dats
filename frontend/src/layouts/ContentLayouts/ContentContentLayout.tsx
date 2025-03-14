import { Box } from "@mui/material";
import { ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { LayoutActions } from "../layoutSlice";
import { HorizontalPercentageResizablePanel } from "../ResizePanel/HorizontalPercentageResizablePanel.tsx";

function ContentContentLayout({ leftContent, rightContent }: { leftContent: ReactNode; rightContent: ReactNode }) {
  const horizontalContentPercentage = useAppSelector((state) => state.layout.horizontalContentPercentage);
  const dispatch = useAppDispatch();

  return (
    <Box sx={{ width: "100%", height: "100%", overflow: "hidden", bgcolor: "grey.200", p: 2 }}>
      <HorizontalPercentageResizablePanel
        leftContent={<Box sx={{ height: "100%", overflowY: "auto", pr: 1, py: 1 }}>{leftContent}</Box>}
        rightContent={<Box sx={{ height: "100%", overflowY: "auto", pl: 1, py: 1 }}>{rightContent}</Box>}
        horizontalContentPercentage={horizontalContentPercentage}
        onResize={(percentage) => dispatch(LayoutActions.setHorizontalContentPercentage(percentage))}
      />
    </Box>
  );
}

export default ContentContentLayout;
