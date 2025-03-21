import { ReactNode, memo } from "react";
import { LayoutPercentageKeys } from "../layoutSlice";
import { useLayoutPercentage } from "../ResizePanel/hooks/useLayoutPercentage.ts";
import PercentageResizablePanel from "../ResizePanel/PercentageResizablePanel.tsx";

function ContentContentLayout({ leftContent, rightContent }: { leftContent: ReactNode; rightContent: ReactNode }) {
  const { percentage, handleResize } = useLayoutPercentage(LayoutPercentageKeys.ContentContentLayout);

  return (
    <PercentageResizablePanel
      firstContent={leftContent}
      secondContent={rightContent}
      contentPercentage={percentage}
      onResize={handleResize}
      isHorizontal
    />
  );
}

export default memo(ContentContentLayout);
