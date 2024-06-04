import AddIcon from "@mui/icons-material/Add";
import { ListItemButton, ListItemButtonProps, ListItemIcon, ListItemText } from "@mui/material";
import { useAppDispatch } from "../../plugins/ReduxHooks.ts";
import { CRUDDialogActions } from "../dialogSlice.ts";

interface CodeCreateListItemButtonProps {
  parentCodeId: number | undefined;
}

function CodeCreateListItemButton({
  parentCodeId,
  ...props
}: CodeCreateListItemButtonProps & Omit<ListItemButtonProps, "onClick">) {
  // global client state (redux)
  const dispatch = useAppDispatch();

  return (
    <ListItemButton {...props} onClick={() => dispatch(CRUDDialogActions.openCodeCreateDialog({ parentCodeId }))}>
      <ListItemIcon>
        <AddIcon />
      </ListItemIcon>
      <ListItemText primary="Create new code" />
    </ListItemButton>
  );
}

export default CodeCreateListItemButton;
