import { PendingAddNodeAction } from "./PendingAddNodeAction.ts";

export interface AddNodeDialogProps {
  onClick: (action: PendingAddNodeAction) => void;
}
