import { Dialog } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import eventBus from "../../EventBus";
import {
  AttachedObjectType,
  BBoxAnnotationReadResolvedCode,
  CodeRead,
  DocumentTagRead,
  SourceDocumentRead,
  SpanAnnotationReadResolved,
} from "../../api/openapi";
import TagHooks from "../../api/TagHooks";
import CodeHooks from "../../api/CodeHooks";
import SdocHooks from "../../api/SdocHooks";
import MemoHooks from "../../api/MemoHooks";
import { MemoContentTag } from "./MemoContentTag";
import { MemoContentSourceDocument } from "./MemoContentSourceDocument";
import { MemoContentCode } from "./MemoContentCode";
import SpanAnnotationHooks from "../../api/SpanAnnotationHooks";
import { MemoContentSpanAnnotation } from "./MemoContentSpanAnnotation";
import useGetMemosAttachedObject from "./useGetMemosAttachedObject";
import BboxAnnotationHooks from "../../api/BboxAnnotationHooks";
import { MemoContentBboxAnnotation } from "./MemoContentBboxAnnotation";
import { useAuth } from "../../auth/AuthProvider";
import { MemoEvent } from "./MemoAPI";

const useGetMemoQuery = (type: AttachedObjectType | undefined) => {
  switch (type) {
    case AttachedObjectType.DOCUMENT_TAG:
      return TagHooks.useGetMemo;
    case AttachedObjectType.CODE:
      return CodeHooks.useGetMemo;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return SdocHooks.useGetMemo;
    case AttachedObjectType.SPAN_ANNOTATION:
      return SpanAnnotationHooks.useGetMemo;
    case AttachedObjectType.BBOX_ANNOTATION:
      return BboxAnnotationHooks.useGetMemo;
    default:
      return MemoHooks.useGetMemo;
  }
};

export default function MemoDialog() {
  const { user } = useAuth();

  // state
  const [open, setOpen] = useState(false);
  const [memoEventData, setMemoEventData] = useState<MemoEvent>();

  // query
  // there are three cases (attachedObjectType is always set!):
  // 1. memoId is set, attachedObjectId is set
  // 2. memoId is not set, attachedObjectId is set
  // 3. memoId is set, attachedObjectId is not set
  const memo = useGetMemoQuery(memoEventData?.memoId ? undefined : memoEventData?.attachedObjectType)(
    memoEventData?.memoId ? memoEventData.memoId : memoEventData?.attachedObjectId,
    user.data?.id
  );
  const attachedObject = useGetMemosAttachedObject(memoEventData?.attachedObjectType)(memoEventData?.attachedObjectId);

  // listen to open-memo event and open the dialog
  const openModal = useCallback((event: CustomEventInit<MemoEvent>) => {
    setOpen(true);
    setMemoEventData(event.detail);
  }, []);

  useEffect(() => {
    eventBus.on("open-memo", openModal);
    return () => {
      eventBus.remove("open-memo", openModal);
    };
  }, [openModal]);

  // update data once we got memo from db
  useEffect(() => {
    if (memo.data) {
      if (
        memo.data.attached_object_id !== memoEventData?.attachedObjectId ||
        memo.data.attached_object_type !== memoEventData?.attachedObjectType
      ) {
        setMemoEventData({
          attachedObjectId: memo.data.attached_object_id,
          attachedObjectType: memo.data.attached_object_type,
        });
      }
    }
  }, [memo.data, memoEventData]);

  const handleClose = () => {
    setOpen(false);
    setMemoEventData(undefined);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      {attachedObject.isSuccess && (memo.isSuccess || !memo.isLoading) && memoEventData && (
        <>
          {memoEventData.attachedObjectType === AttachedObjectType.CODE ? (
            <MemoContentCode memo={memo.data} code={attachedObject.data as CodeRead} closeDialog={handleClose} />
          ) : memoEventData.attachedObjectType === AttachedObjectType.SOURCE_DOCUMENT ? (
            <MemoContentSourceDocument
              memo={memo.data}
              sdoc={attachedObject.data as SourceDocumentRead}
              closeDialog={handleClose}
            />
          ) : memoEventData.attachedObjectType === AttachedObjectType.DOCUMENT_TAG ? (
            <MemoContentTag memo={memo.data} tag={attachedObject.data as DocumentTagRead} closeDialog={handleClose} />
          ) : memoEventData.attachedObjectType === AttachedObjectType.SPAN_ANNOTATION ? (
            <MemoContentSpanAnnotation
              memo={memo.data}
              spanAnnotation={attachedObject.data as SpanAnnotationReadResolved}
              closeDialog={handleClose}
            />
          ) : memoEventData.attachedObjectType === AttachedObjectType.BBOX_ANNOTATION ? (
            <MemoContentBboxAnnotation
              memo={memo.data}
              bboxAnnotation={attachedObject.data as BBoxAnnotationReadResolvedCode}
              closeDialog={handleClose}
            />
          ) : (
            <div>This memo type is not supported!</div>
          )}
        </>
      )}
      {((memo.isLoading && memo.isFetching) || (attachedObject.isLoading && attachedObject.isFetching)) && (
        <>Loading!</>
      )}
      {attachedObject.isError && <div>Error: {attachedObject.error.message}</div>}
    </Dialog>
  );
}
