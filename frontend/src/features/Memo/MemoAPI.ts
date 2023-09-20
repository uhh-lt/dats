import eventBus from "../../EventBus";
import { AttachedObjectType, MemoRead } from "../../api/openapi";

export type MemoCreateSuccessHandler = ((memo: MemoRead) => void) | undefined;

export interface MemoEvent {
  memoId?: number;
  attachedObjectType: AttachedObjectType;
  attachedObjectId?: number;
  onCreateSuccess?: MemoCreateSuccessHandler;
}

function openMemo(props: MemoEvent) {
  if (props.memoId === undefined && props.attachedObjectId === undefined) {
    throw new Error("You have to provide a memoId or an attachedObjectId!");
  }
  eventBus.dispatch("open-memo", props);
}

const MemoAPI = { openMemo };

export default MemoAPI;
