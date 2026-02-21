import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { IconButton, Tooltip } from "@mui/material";
import { memo, useCallback } from "react";
import { getTabInfoFromPath } from "../../../layouts/TabBar/tabInfo.tsx";
import { TabActions } from "../../../layouts/TabBar/tabSlice.ts";
import { TabData } from "../../../layouts/TabBar/types/TabData.ts";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";

export const OpenInTabsButton = memo(({ sdocIds, projectId }: { sdocIds: number[]; projectId: number }) => {
  const dispatch = useAppDispatch();
  const handleClick = useCallback(() => {
    const tabDatas = sdocIds.map((sdocId) => {
      const tabData = getTabInfoFromPath(`/project/${projectId}/annotation/${sdocId}`);
      const newTab: TabData = {
        id: `tab-${Date.now()}`,
        ...tabData,
      };
      return newTab;
    });
    dispatch(TabActions.addMultipleTabs({ tabDatas, projectId }));
  }, [sdocIds, dispatch, projectId]);

  return (
    <Tooltip title="Open in tabs">
      <IconButton onClick={handleClick}>
        <OpenInNewIcon />
      </IconButton>
    </Tooltip>
  );
});
