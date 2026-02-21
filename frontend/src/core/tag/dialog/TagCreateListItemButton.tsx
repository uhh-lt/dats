import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { memo, useCallback } from "react";
import { useAppDispatch } from "../../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../../../store/dialogSlice.ts";
import { Icon, getIconComponent } from "../../../utils/icons/iconUtils.tsx";

interface TagActionButtonCreateProps {
  tagName: string;
}

export const TagCreateListItemButton = memo(
  ({ tagName, ...props }: TagActionButtonCreateProps & ListItemButtonProps) => {
    const dispatch = useAppDispatch();

    const handleClick = useCallback(() => {
      dispatch(CRUDDialogActions.openTagCreateDialog({ tagName }));
    }, [dispatch, tagName]);

    const buttonText = tagName.length > 0 ? `"${tagName}" (Create new)` : "Create new tag";

    return (
      <ListItemButton onClick={handleClick} {...props}>
        <ListItemIcon>{getIconComponent(Icon.CREATE)}</ListItemIcon>
        <ListItemText primary={buttonText} />
      </ListItemButton>
    );
  },
);
