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

interface MemoGetData {
  idToGetMemo: number | undefined;
  attachedObjectId: number | undefined;
  attachedObjectType: AttachedObjectType | undefined;
}

export default function MemoDialog() {
  const { user } = useAuth();

  // state
  const [open, setOpen] = useState(false);
  const [memoGetData, setMemoGetData] = useState<MemoGetData>({
    idToGetMemo: undefined,
    attachedObjectId: undefined,
    attachedObjectType: undefined,
  });

  // query
  const memo = useGetMemoQuery(memoGetData.attachedObjectType)(memoGetData.idToGetMemo, user.data?.id);
  const attachedObject = useGetMemosAttachedObject(memoGetData.attachedObjectType)(memoGetData.attachedObjectId);

  // listen to open-memo event and open the dialog
  const openModal = useCallback((event: CustomEventInit) => {
    setOpen(true);
    setMemoGetData({
      idToGetMemo: event.detail.data.id,
      attachedObjectId: event.detail.memoType ? event.detail.data.id : undefined,
      attachedObjectType: event.detail.memoType,
    });
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
        memo.data.attached_object_id !== memoGetData.attachedObjectId ||
        memo.data.attached_object_type !== memoGetData.attachedObjectType
      ) {
        setMemoGetData({
          idToGetMemo: memo.data.attached_object_id,
          attachedObjectId: memo.data.attached_object_id,
          attachedObjectType: memo.data.attached_object_type,
        });
      }
    }
  }, [memo.data, memoGetData]);

  const handleClose = () => {
    setOpen(false);
    setMemoGetData({
      idToGetMemo: undefined,
      attachedObjectId: undefined,
      attachedObjectType: undefined,
    });
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      {attachedObject.isSuccess && (memo.isSuccess || !memo.isLoading) && (
        <>
          {memoGetData.attachedObjectType === AttachedObjectType.CODE ? (
            <MemoContentCode memo={memo.data} code={attachedObject.data as CodeRead} closeDialog={handleClose} />
          ) : memoGetData.attachedObjectType === AttachedObjectType.SOURCE_DOCUMENT ? (
            <MemoContentSourceDocument
              memo={memo.data}
              sdoc={attachedObject.data as SourceDocumentRead}
              closeDialog={handleClose}
            />
          ) : memoGetData.attachedObjectType === AttachedObjectType.DOCUMENT_TAG ? (
            <MemoContentTag memo={memo.data} tag={attachedObject.data as DocumentTagRead} closeDialog={handleClose} />
          ) : memoGetData.attachedObjectType === AttachedObjectType.SPAN_ANNOTATION ? (
            <MemoContentSpanAnnotation
              memo={memo.data}
              spanAnnotation={attachedObject.data as SpanAnnotationReadResolved}
              closeDialog={handleClose}
            />
          ) : memoGetData.attachedObjectType === AttachedObjectType.BBOX_ANNOTATION ? (
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
