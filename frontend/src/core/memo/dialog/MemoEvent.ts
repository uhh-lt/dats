import { AttachedObjectType } from "@api/openapi/models/AttachedObjectType";
import { MemoCreateSuccessHandler } from "./MemoDialogAPI";

export interface MemoEvent {
  memoId?: number;
  attachedObjectType: AttachedObjectType;
  attachedObjectId?: number;
  onCreateSuccess?: MemoCreateSuccessHandler;
}
