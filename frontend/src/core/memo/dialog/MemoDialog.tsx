import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { CircularProgress, Dialog } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@plugins/redux";
import { useCallback } from "react";
import { MemoHooks } from "../../../api/MemoHooks";
import { AttachedObjectType } from "../../../api/openapi/models/AttachedObjectType";
import { MemoRead } from "../../../api/openapi/models/MemoRead";
import { useDialogMaximize } from "../../../hooks/useDialogMaximize";
import { UIDialogActions } from "../../../store/global/dialogSlice";
import { useGetMemosAttachedObject } from "../useGetMemosAttachedObject";
import { MemoDialogContent } from "./_components/MemoDialogContent";

export function MemoDialog() {
  const isMemoDialogOpen = useAppSelector((state) => state.dialog.isMemoDialogOpen);
  const memoEventData = useAppSelector((state) => state.dialog.memoEventData);
  const dispatch = useAppDispatch();

  const handleClose = useCallback(() => {
    dispatch(UIDialogActions.closeMemoDialog());
  }, [dispatch]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  return (
    <Dialog open={isMemoDialogOpen} onClose={handleClose} maxWidth="md" fullWidth fullScreen={isMaximized}>
      <DATSDialogHeader
        title="Memo"
        onClose={handleClose}
        isMaximized={isMaximized}
        onToggleMaximize={toggleMaximize}
      />
      {memoEventData?.memoId ? (
        <MemoDialogByID
          memoId={memoEventData.memoId}
          closeDialog={handleClose}
          onMemoCreateSuccess={memoEventData?.onCreateSuccess}
        />
      ) : memoEventData?.attachedObjectId && memoEventData?.attachedObjectType ? (
        <MemoDialogByAttachedObject
          attachedObjectId={memoEventData.attachedObjectId}
          attachedObjectType={memoEventData.attachedObjectType}
          closeDialog={handleClose}
          onMemoCreateSuccess={memoEventData?.onCreateSuccess}
        />
      ) : null}
    </Dialog>
  );
}

interface SharedProps {
  closeDialog: () => void;
  onMemoCreateSuccess?: (memo: MemoRead) => void;
}

function MemoDialogByID({ memoId, ...props }: { memoId: number } & SharedProps) {
  const memo = MemoHooks.useGetMemo(memoId);
  if (memo.isSuccess) {
    return (
      <MemoDialog2
        memo={memo.data}
        attachedObjectId={memo.data.attached_object_id}
        attachedObjectType={memo.data.attached_object_type}
        {...props}
      />
    );
  } else if (memo.isLoading) {
    return <CircularProgress />;
  } else if (memo.isError) {
    return <div>Error: {memo.error.message}</div>;
  } else {
    return null;
  }
}

function MemoDialogByAttachedObject(
  props: { attachedObjectId: number; attachedObjectType: AttachedObjectType } & SharedProps,
) {
  const memo = MemoHooks.useGetUserMemo(props.attachedObjectType, props.attachedObjectId);
  if (memo.isSuccess) {
    return <MemoDialog2 memo={memo.data} {...props} />;
  } else if (memo.isLoading) {
    return <CircularProgress />;
  } else if (memo.isError) {
    return <MemoDialog2 memo={undefined} {...props} />;
  } else {
    return null;
  }
}

function MemoDialog2({
  memo,
  attachedObjectId,
  attachedObjectType,
  closeDialog,
  onMemoCreateSuccess,
}: {
  memo: MemoRead | undefined;
  attachedObjectId: number;
  attachedObjectType: AttachedObjectType;
} & SharedProps) {
  // query
  // there are three cases (attachedObjectType is always set!):
  // 1. memoId is set, attachedObjectId is set
  // 2. memoId is not set, attachedObjectId is set
  // 3. memoId is set, attachedObjectId is not set
  const attachedObject = useGetMemosAttachedObject(attachedObjectType, attachedObjectId);

  return (
    <>
      {attachedObject.data ? (
        <MemoDialogContent
          memo={memo}
          attachedObject={attachedObject.data}
          attachedObjectType={attachedObjectType}
          closeDialog={closeDialog}
          onMemoCreateSuccess={onMemoCreateSuccess}
        />
      ) : attachedObject.isLoading && attachedObject.isFetching ? (
        <>Loading!</>
      ) : attachedObject.isError ? (
        <div>Error: {attachedObject.error.message}</div>
      ) : null}
    </>
  );
}
