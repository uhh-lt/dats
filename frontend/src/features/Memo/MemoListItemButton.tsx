import CommentIcon from "@mui/icons-material/Comment";
import { ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import MemoAPI, { MemoEvent } from "./MemoAPI";

interface MemoMenuItemProps {
  onClick: (() => void) | undefined;
  content?: React.ReactNode;
}

export default function MemoListItemButton({
  memoId,
  attachedObjectId,
  attachedObjectType,
  onClick,
  content,
}: MemoEvent & MemoMenuItemProps) {
  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (onClick) {
      onClick();
    }
    MemoAPI.openMemo({ memoId, attachedObjectId, attachedObjectType });
  };
  return (
    <ListItem disablePadding>
      <ListItemButton onClick={handleClick}>
        <ListItemIcon>
          <CommentIcon fontSize="small" />
        </ListItemIcon>
        {content ? <>{content}</> : <ListItemText primary={"Memo"} />}
      </ListItemButton>
    </ListItem>
  );
}
