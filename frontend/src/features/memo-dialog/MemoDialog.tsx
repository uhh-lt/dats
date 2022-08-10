import { Dialog } from "@mui/material";
import React, { useCallback, useEffect, useState } from "react";
import eventBus from "../../EventBus";
import {
  AttachedObjectType,
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

const useGetAttachedObjectQuery = (type: AttachedObjectType | undefined) => {
  switch (type) {
    case AttachedObjectType.DOCUMENT_TAG:
      return TagHooks.useGetTag;
    case AttachedObjectType.CODE:
      return CodeHooks.useGetCode;
    case AttachedObjectType.SOURCE_DOCUMENT:
      return SdocHooks.useGetDocument;
    case AttachedObjectType.SPAN_ANNOTATION:
      return SpanAnnotationHooks.useGetAnnotation;
    default:
      return CodeHooks.useGetCode;
  }
};

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
    default:
      return MemoHooks.useGetMemo;
  }
};

export default function MemoDialog() {
  // state
  const [open, setOpen] = useState(false);
  const [idToGetMemo, setIdToGetMemo] = useState<number | undefined>(undefined);
  const [attachedType, setAttachedType] = useState<AttachedObjectType | undefined>(undefined);
  const [attachedId, setAttachedId] = useState<number | undefined>(undefined);

  // query
  const memo = useGetMemoQuery(attachedType)(idToGetMemo);
  const attachedObject = useGetAttachedObjectQuery(attachedType)(attachedId);

  // listen to open-memo event and open the dialog
  const openModal = useCallback((event: CustomEventInit) => {
    setOpen(true);
    setIdToGetMemo(event.detail.data.id);
    setAttachedId(event.detail.memoType ? event.detail.data.id : undefined);
    setAttachedType(event.detail.memoType);
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
      if (memo.data.attached_object_id !== attachedId) setAttachedId(memo.data.attached_object_id);
      if (memo.data.attached_object_type !== attachedType) setAttachedType(memo.data.attached_object_type);
    }
  }, [memo.data, attachedId, attachedType]);

  const handleClose = () => {
    setOpen(false);
    setAttachedType(undefined);
    setAttachedId(undefined);
    setIdToGetMemo(undefined);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      {attachedObject.isSuccess && (memo.isSuccess || !memo.isLoading) && (
        <>
          {attachedType === AttachedObjectType.CODE ? (
            <MemoContentCode memo={memo.data} code={attachedObject.data as CodeRead} />
          ) : attachedType === AttachedObjectType.SOURCE_DOCUMENT ? (
            <MemoContentSourceDocument memo={memo.data} sdoc={attachedObject.data as SourceDocumentRead} />
          ) : attachedType === AttachedObjectType.DOCUMENT_TAG ? (
            <MemoContentTag memo={memo.data} tag={attachedObject.data as DocumentTagRead} />
          ) : attachedType === AttachedObjectType.SPAN_ANNOTATION ? (
            <MemoContentSpanAnnotation
              memo={memo.data}
              spanAnnotation={attachedObject.data as SpanAnnotationReadResolved}
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
