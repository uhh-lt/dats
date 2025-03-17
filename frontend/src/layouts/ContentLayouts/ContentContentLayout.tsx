import { ReactNode } from "react";
import { useAppDispatch, useAppSelector } from "../../plugins/ReduxHooks";
import { LayoutActions } from "../layoutSlice";
import { PercentageResizablePanel } from "../ResizePanel/PercentageResizablePanel.tsx";

function ContentContentLayout({ leftContent, rightContent }: { leftContent: ReactNode; rightContent: ReactNode }) {
  const horizontalContentPercentage = useAppSelector((state) => state.layout.horizontalContentPercentage);
  const dispatch = useAppDispatch();

  return (
    <PercentageResizablePanel
      firstContent={leftContent}
      secondContent={rightContent}
      contentPercentage={horizontalContentPercentage}
      onResize={(percentage) => dispatch(LayoutActions.setHorizontalContentPercentage(percentage))}
      isHorizontal
    />
  );
}

export default ContentContentLayout;
