import eventBus from "../../EventBus";
import { AttachedObjectType } from "../../api/openapi";

export interface MemoEvent {
  memoId?: number;
  attachedObjectType: AttachedObjectType;
  attachedObjectId?: number;
}

function openMemo(props: MemoEvent) {
  if (props.memoId === undefined && props.attachedObjectId === undefined) {
    throw new Error("You have to provide a memoId or an attachedObjectId!");
  }
  eventBus.dispatch("open-memo", props);
}

const MemoAPI = { openMemo };

export default MemoAPI;
