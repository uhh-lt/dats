import { PendingAddNodeAction } from "./PendingAddNodeAction";

export interface AddNodeDialogProps {
  onClick: (action: PendingAddNodeAction) => void;
}
