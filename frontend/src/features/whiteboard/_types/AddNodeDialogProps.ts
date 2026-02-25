import { ButtonProps } from "@mui/material";
import { PendingAddNodeAction } from "./PendingAddNodeAction";

export interface AddNodeDialogProps {
  onClick: (action: PendingAddNodeAction) => void;
  buttonProps?: Omit<ButtonProps, "onClick">;
}
