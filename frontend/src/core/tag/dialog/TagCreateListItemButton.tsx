import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { useAppDispatch } from "@plugins/redux";
import { UIDialogActions } from "@store/global/dialogSlice";
import { Icon, getIconComponent } from "@utils/icons/iconUtils";
import { memo, useCallback } from "react";

interface TagActionButtonCreateProps {
  tagName: string;
}

export const TagCreateListItemButton = memo(
  ({ tagName, ...props }: TagActionButtonCreateProps & ListItemButtonProps) => {
    const dispatch = useAppDispatch();

    const handleClick = useCallback(() => {
      dispatch(UIDialogActions.openTagCreateDialog({ tagName }));
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
