import { IconButton } from "@mui/material";
import Tooltip from "@mui/material/Tooltip";
import React, { memo, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { SearchActions } from "../../../views/search/DocumentSearch/searchSlice.ts";

function FolderToggleVisibilityButton() {
  // redux (global client state)
  const showFolders = useAppSelector((state) => state.search.showFolders);
  const dispatch = useAppDispatch();

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      event.stopPropagation();
      dispatch(SearchActions.onToggleShowFolders());
    },
    [dispatch],
  );

  return (
    <Tooltip title={showFolders ? "Hide folders" : "Show folders"}>
      <span>
        <IconButton onClick={handleClick}>
          {getIconComponent(showFolders ? Icon.VISIBILITY : Icon.VISIBILITY_OFF)}
        </IconButton>
      </span>
    </Tooltip>
  );
}

export default memo(FolderToggleVisibilityButton);
