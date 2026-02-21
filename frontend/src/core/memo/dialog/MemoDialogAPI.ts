import { eventBus } from "../../../EventBus.ts";
import { MemoRead } from "../../../api/openapi/models/MemoRead.ts";
import { MemoEvent } from "./MemoEvent";

export type MemoCreateSuccessHandler = ((memo: MemoRead) => void) | undefined;

function openMemo(props: MemoEvent) {
  if (props.memoId === undefined && props.attachedObjectId === undefined) {
    throw new Error("You have to provide a memoId or an attachedObjectId!");
  }
  eventBus.dispatch("open-memo", props);
}

export const MemoDialogAPI = { openMemo };
