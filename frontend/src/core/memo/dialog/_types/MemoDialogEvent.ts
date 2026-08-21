import { MemoRead } from "@models/MemoRead";
import { MemoEditorTarget } from "../../editor";

export type MemoDialogEvent = MemoEditorTarget & {
  onCreateSuccess?: ((memo: MemoRead) => void) | undefined;
};
