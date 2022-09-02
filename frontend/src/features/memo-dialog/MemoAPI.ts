import eventBus from "../../EventBus";
import { AttachedObjectType } from "../../api/openapi";

export interface MemoEvent {
  codeId?: number;
  sdocId?: number;
  tagId?: number;
  memoId?: number;
  spanAnnotationId?: number;
  bboxId?: number;
}

function openMemo(props: MemoEvent) {
  if (props.codeId) {
    eventBus.dispatch("open-memo", { memoType: AttachedObjectType.CODE, data: { id: props.codeId } });
  } else if (props.sdocId) {
    eventBus.dispatch("open-memo", { memoType: AttachedObjectType.SOURCE_DOCUMENT, data: { id: props.sdocId } });
  } else if (props.tagId) {
    eventBus.dispatch("open-memo", { memoType: AttachedObjectType.DOCUMENT_TAG, data: { id: props.tagId } });
  } else if (props.memoId) {
    eventBus.dispatch("open-memo", { memoType: undefined, data: { id: props.memoId } });
  } else if (props.spanAnnotationId) {
    eventBus.dispatch("open-memo", {
      memoType: AttachedObjectType.SPAN_ANNOTATION,
      data: { id: props.spanAnnotationId },
    });
  } else if (props.bboxId) {
    eventBus.dispatch("open-memo", {
      memoType: AttachedObjectType.BBOX_ANNOTATION,
      data: { id: props.bboxId },
    });
  } else {
    throw new Error("You have to provide exactly one MemoEvent argument!");
  }
}

const MemoAPI = { openMemo };

export default MemoAPI;
