import { ReactNode, memo } from "react";
import { PercentageResizablePanel, useLayoutPercentage  } from "@components/resizable-panels";

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
