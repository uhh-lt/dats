import { ContextMenuPosition } from "./ContextMenuPosition.ts";

export interface ContextMenuProps {
  position: ContextMenuPosition | null;
  handleClose: () => void;
}
