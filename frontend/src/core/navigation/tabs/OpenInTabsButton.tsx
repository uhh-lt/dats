import { Icon } from "@components/icons";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { IconButton, Tooltip } from "@mui/material";
import { useAppDispatch } from "@store/storeHooks";
import { memo, useCallback } from "react";
import { TabData, TabRouteSearch } from "../_types/TabData";
import { TabsActions } from "../tabsSlice";

interface OpenInTabsButtonProps {
  sdocIds: number[];
  projectId: number;
  // the search params of every opened annotation view, e.g. a comparison of two annotators
  search?: TabRouteSearch;
  // the tooltip of the button
  tooltip?: string;
}

export const OpenInTabsButton = memo(
  ({ sdocIds, projectId, search, tooltip = "Open in tabs" }: OpenInTabsButtonProps) => {
    const dispatch = useAppDispatch();

    const handleClick = useCallback(() => {
      const tabs: TabData[] = sdocIds.map((sdocId) => {
        const pathname = `/project/${projectId}/annotation/${sdocId}`;
        return {
          id: pathname,
          route: { to: pathname, search },
          label: `Document ${sdocId}`,
          icon: Icon.ANNOTATION,
        };
      });

      dispatch(TabsActions.addOrUpdateTabs({ tabs, projectId }));
    }, [dispatch, projectId, sdocIds, search]);

    return (
      <Tooltip title={tooltip}>
        <IconButton onClick={handleClick}>
          <OpenInNewIcon />
        </IconButton>
      </Tooltip>
    );
  },
);
