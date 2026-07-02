import { getIconComponent, Icon } from "@components/icons";
import { IconButton, Tooltip } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback } from "react";
import { SearchActions } from "../../../store/documentSearchSlice";

export function FolderToggleVisibilityButton() {
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
