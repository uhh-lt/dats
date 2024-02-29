import { Dialog } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import eventBus from "../../EventBus.ts";

import { AttachedObjectType } from "../../api/openapi/models/AttachedObjectType.ts";
import { BBoxAnnotationReadResolvedCode } from "../../api/openapi/models/BBoxAnnotationReadResolvedCode.ts";
import { CodeRead } from "../../api/openapi/models/CodeRead.ts";
import { DocumentTagRead } from "../../api/openapi/models/DocumentTagRead.ts";
import { SourceDocumentRead } from "../../api/openapi/models/SourceDocumentRead.ts";
import { SpanAnnotationReadResolved } from "../../api/openapi/models/SpanAnnotationReadResolved.ts";
import { useAuth } from "../../auth/useAuth.ts";
import { MemoEvent } from "./MemoAPI.ts";
import { MemoContentBboxAnnotation } from "./MemoContentBboxAnnotation.tsx";
import { MemoContentCode } from "./MemoContentCode.tsx";
import { MemoContentSourceDocument } from "./MemoContentSourceDocument.tsx";
import { MemoContentSpanAnnotation } from "./MemoContentSpanAnnotation.tsx";
import { MemoContentTag } from "./MemoContentTag.tsx";
import { useGetMemoQuery } from "./useGetMemoQuery.ts";
import useGetMemosAttachedObject from "./useGetMemosAttachedObject.ts";

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
    user?.id,
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
            <MemoContentCode
              memo={memo.data}
              code={attachedObject.data as CodeRead}
              closeDialog={handleClose}
              onMemoCreateSuccess={memoEventData.onCreateSuccess}
            />
          ) : memoEventData.attachedObjectType === AttachedObjectType.SOURCE_DOCUMENT ? (
            <MemoContentSourceDocument
              memo={memo.data}
              sdoc={attachedObject.data as SourceDocumentRead}
              closeDialog={handleClose}
              onMemoCreateSuccess={memoEventData.onCreateSuccess}
            />
          ) : memoEventData.attachedObjectType === AttachedObjectType.DOCUMENT_TAG ? (
            <MemoContentTag
              memo={memo.data}
              tag={attachedObject.data as DocumentTagRead}
              closeDialog={handleClose}
              onMemoCreateSuccess={memoEventData.onCreateSuccess}
            />
          ) : memoEventData.attachedObjectType === AttachedObjectType.SPAN_ANNOTATION ? (
            <MemoContentSpanAnnotation
              memo={memo.data}
              spanAnnotation={attachedObject.data as SpanAnnotationReadResolved}
              closeDialog={handleClose}
              onMemoCreateSuccess={memoEventData.onCreateSuccess}
            />
          ) : memoEventData.attachedObjectType === AttachedObjectType.BBOX_ANNOTATION ? (
            <MemoContentBboxAnnotation
              memo={memo.data}
              bboxAnnotation={attachedObject.data as BBoxAnnotationReadResolvedCode}
              closeDialog={handleClose}
              onMemoCreateSuccess={memoEventData.onCreateSuccess}
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
