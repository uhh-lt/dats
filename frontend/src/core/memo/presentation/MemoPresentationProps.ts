import { MemoRead } from "@models/MemoRead";
import { MemoRow } from "@models/MemoRow";

/**
 * The memo data accepted by every memo presentation container. A presentation
 * component accepts a full `MemoRead`, a search `MemoRow`, or just an id (which
 * it fetches itself).
 */
type MemoPresentationData = MemoRead | MemoRow | number;

/**
 * Render flags shared by all memo presentation containers (card, list item, feed
 * item, ...). Each container renders the subset of blocks its flags enable, so a
 * single component can be customized for every surface in the application.
 */
export interface MemoPresentationFlags {
  renderIcon?: boolean;
  renderTitle?: boolean;
  /** Excerpt for a `MemoRow`, full markdown content for a `MemoRead`. */
  renderContent?: boolean;
  renderAuthor?: boolean;
  renderCreatedDate?: boolean;
  renderUpdatedDate?: boolean;
  renderFavoriteButton?: boolean;
  renderAttachedObject?: boolean;
  attachedObjectLink?: boolean;
  /** Context action menu (favorite / delete). */
  renderActionMenu?: boolean;
}

export interface MemoPresentationProps extends MemoPresentationFlags {
  memo: MemoPresentationData;
  onSelect?: (memoId: number) => void;
  onDeleteClick?: () => void;
  onStarredClick?: () => void;
}
