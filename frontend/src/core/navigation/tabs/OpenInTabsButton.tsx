import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { IconButton, Tooltip } from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { Icon } from "@utils/icons/iconUtils";
import { memo, useCallback } from "react";
import { TabData } from "../_types/TabData";
import { TabActions } from "../tabSlice";

export const OpenInTabsButton = memo(({ sdocIds, projectId }: { sdocIds: number[]; projectId: number }) => {
  const dispatch = useAppDispatch();

  const handleClick = useCallback(() => {
    const tabs: TabData[] = sdocIds.map((sdocId) => {
      const pathname = `/project/${projectId}/annotation/${sdocId}`;
      return {
        id: pathname,
        href: pathname,
        label: `Document ${sdocId}`,
        icon: Icon.ANNOTATION,
      };
    });

    dispatch(TabActions.addOrUpdateTabs({ tabs, projectId }));
  }, [dispatch, projectId, sdocIds]);

  return (
    <Tooltip title="Open in tabs">
      <IconButton onClick={handleClick}>
        <OpenInNewIcon />
      </IconButton>
    </Tooltip>
  );
});
