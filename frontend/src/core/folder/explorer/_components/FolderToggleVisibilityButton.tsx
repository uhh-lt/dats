import { IconButton, Tooltip } from "@mui/material";
import React, { memo, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../../utils/icons/iconUtils.tsx";
import { SearchActions } from "../../../views/search/DocumentSearch/searchSlice.ts";

function FolderToggleVisibilityButton() {
  // redux (global client state)
  const showFolders = useAppSelector((state) => state.search.showFolders);
  const dispatch = useAppDispatch();

  const handleClick: React.MouseEventHandler<HTMLButtonElement> = useCallback(
    (event) => {
      event.stopPropagation();
      dispatch(SearchActions.onToggleShowFolders());
    },
    [dispatch],
  );

  return (
    <Tooltip title="Show/hide folders">
      <span>
        <IconButton onClick={handleClick}>{getIconComponent(showFolders ? Icon.FOLDER : Icon.FOLDER_OFF)}</IconButton>
      </span>
    </Tooltip>
  );
}

export default memo(FolderToggleVisibilityButton);
