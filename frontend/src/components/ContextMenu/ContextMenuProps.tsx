import { ContextMenuPosition } from "./ContextMenuPosition";

export interface ContextMenuProps {
  position: ContextMenuPosition | null;
  handleClose: () => void;
}
