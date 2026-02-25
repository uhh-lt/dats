import { ReactNode, memo } from "react";
import { PercentageResizablePanel } from "../resizable-panels/PercentageResizablePanel";
import { useLayoutPercentage } from "../resizable-panels/useLayoutPercentage";

export const ContentContentLayout = memo(
  ({ leftContent, rightContent }: { leftContent: ReactNode; rightContent: ReactNode }) => {
    const { percentage, handleResize } = useLayoutPercentage("content-content-layout");

    return (
      <PercentageResizablePanel
        firstContent={leftContent}
        secondContent={rightContent}
        contentPercentage={percentage}
        onResize={handleResize}
        isHorizontal
      />
    );
  },
);
