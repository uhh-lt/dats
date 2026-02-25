import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { memo, MouseEventHandler, useCallback } from "react";
import { SearchActions } from "../../../../features/search/DocumentSearch/searchSlice";
import { getIconComponent, Icon } from "../../../../utils/icons/iconUtils";

export const FolderToggleVisibilityMenuItem = memo(({ onClick, ...props }: MenuItemProps) => {
  // redux (global client state)
  const showFolders = useAppSelector((state) => state.search.showFolders);
  const dispatch = useAppDispatch();

  const handleClick: MouseEventHandler<HTMLLIElement> = useCallback(
    (event) => {
      event.stopPropagation();
      if (onClick) onClick(event);
      dispatch(SearchActions.onToggleShowFolders());
    },
    [dispatch, onClick],
  );

  return (
    <MenuItem onClick={handleClick} {...props}>
      <ListItemIcon>{getIconComponent(showFolders ? Icon.FOLDER : Icon.FOLDER_OFF)}</ListItemIcon>
      <ListItemText>Show/hide folders</ListItemText>
    </MenuItem>
  );
});
