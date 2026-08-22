import { MemoRead } from "@models/MemoRead";
import { MemoRow } from "@models/MemoRow";

/** Type guard: a search row carries `content_excerpt`, a full memo carries `content`. */
export const isMemoRow = (memo: MemoRead | MemoRow): memo is MemoRow =>
  "content_excerpt" in memo && memo.content_excerpt !== undefined;

/** The textual content a presentation container shows: excerpt for rows, full content otherwise. */
export const getMemoContent = (memo: MemoRead | MemoRow): string =>
  isMemoRow(memo) ? memo.content_excerpt : memo.content;
