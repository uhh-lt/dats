import { Dialog } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import eventBus from "../../../EventBus.ts";

import { useGetMemoQuery } from "../useGetMemoQuery.ts";
import useGetMemosAttachedObject from "../useGetMemosAttachedObject.ts";
import { MemoEvent } from "./MemoDialogAPI.ts";
import { MemoDialogContent } from "./MemoDialogContent.tsx";

export default function MemoDialog() {
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
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth PaperProps={{ style: { height: "66%" } }}>
      {attachedObject.isSuccess && (memo.isSuccess || !memo.isLoading) && memoEventData ? (
        <MemoDialogContent
          memo={memo.data}
          attachedObject={attachedObject.data}
          attachedObjectType={memoEventData.attachedObjectType}
          closeDialog={handleClose}
          onMemoCreateSuccess={memoEventData.onCreateSuccess}
        />
      ) : (memo.isLoading && memo.isFetching) || (attachedObject.isLoading && attachedObject.isFetching) ? (
        <>Loading!</>
      ) : attachedObject.isError ? (
        <div>Error: {attachedObject.error.message}</div>
      ) : null}
    </Dialog>
  );
}
