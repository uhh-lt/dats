import { ListItemIcon, ListItemText, MenuItem, MenuItemProps } from "@mui/material";
import { memo, MouseEventHandler, useCallback } from "react";
import { SearchActions } from "../../../../features/search/DocumentSearch/searchSlice.ts";
import { useAppDispatch, useAppSelector } from "../../../../plugins/ReduxHooks.ts";
import { getIconComponent, Icon } from "../../../../utils/icons/iconUtils.tsx";

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
      <ListItemIcon>{getIconComponent(showFolders ? Icon.VISIBILITY : Icon.VISIBILITY_OFF)}</ListItemIcon>
      <ListItemText>Show/hide folders</ListItemText>
    </MenuItem>
  );
});
