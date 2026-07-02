import { Icon, getIconComponent } from "@components/icons";
import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { useOpenDialog } from "@store/global/dialogBusSlice";
import { memo, useCallback } from "react";

interface TagActionButtonCreateProps {
  tagName: string;
}

export const TagCreateListItemButton = memo(
  ({ tagName, ...props }: TagActionButtonCreateProps & ListItemButtonProps) => {
    const openTagCreateDialog = useOpenDialog("tagCreate");

    const handleClick = useCallback(() => {
      openTagCreateDialog({ tagName });
    }, [openTagCreateDialog, tagName]);

    const buttonText = tagName.length > 0 ? `"${tagName}" (Create new)` : "Create new tag";

    return (
      <ListItemButton onClick={handleClick} {...props}>
        <ListItemIcon>{getIconComponent(Icon.CREATE)}</ListItemIcon>
        <ListItemText primary={buttonText} />
      </ListItemButton>
    );
  },
);
