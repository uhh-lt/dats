import { AttachedObjectType } from "@models/AttachedObjectType";
import { MemoCreateSuccessHandler } from "./MemoCreateSuccessHandler";

export interface MemoEvent {
  memoId?: number;
  attachedObjectType: AttachedObjectType;
  attachedObjectId?: number;
  onCreateSuccess?: MemoCreateSuccessHandler;
}
