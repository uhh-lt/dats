import eventBus from "../../EventBus.ts";
import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { MemoRead } from "../../api/openapi/models/MemoRead.ts";

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
