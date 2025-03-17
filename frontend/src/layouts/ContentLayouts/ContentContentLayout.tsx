import { Box } from "@mui/material";
import { ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { LayoutActions } from "../layoutSlice";
import { HorizontalPercentageResizablePanel } from "../ResizePanel/HorizontalPercentageResizablePanel.tsx";

function ContentContentLayout({ leftContent, rightContent }: { leftContent: ReactNode; rightContent: ReactNode }) {
  const horizontalContentPercentage = useAppSelector((state) => state.layout.horizontalContentPercentage);
  const dispatch = useAppDispatch();

  return (
    <HorizontalPercentageResizablePanel
      leftContent={<Box sx={{ height: "100%", overflowY: "auto" }}>{leftContent}</Box>}
      rightContent={<Box sx={{ height: "100%", overflowY: "auto" }}>{rightContent}</Box>}
      horizontalContentPercentage={horizontalContentPercentage}
      onResize={(percentage) => dispatch(LayoutActions.setHorizontalContentPercentage(percentage))}
    />
  );
}

export default ContentContentLayout;
