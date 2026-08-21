import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { MemoRead } from "@models/MemoRead";
import { Box, CircularProgress, Dialog, DialogContent, Typography } from "@mui/material";
import { useAppDispatch, useAppSelector } from "@store/storeHooks";
import { useCallback } from "react";
import { MemoActionMenu } from "../MemoActionMenu";
import { MemoAttachedObject, MemoEditor, useMemoEditorData, useMemoPersistence } from "../editor";
import { MemoDialogEvent } from "./_types/MemoDialogEvent";
import { MemoDialogActions } from "./memoDialogSlice";

/**
 * Global memo dialog container: redux-driven open state + dialog chrome
 * (header, maximize, actions). The editing experience lives in MemoEditor,
 * data in useMemoEditorData, persistence in useMemoPersistence.
 */
export function MemoDialog() {
  const isMemoDialogOpen = useAppSelector((state) => state.memoDialog.isMemoDialogOpen);
  const memoEventData = useAppSelector((state) => state.memoDialog.memoEventData);
  const dispatch = useAppDispatch();

  const handleClose = useCallback(() => {
    dispatch(MemoDialogActions.closeMemoDialog());
  }, [dispatch]);

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // data
  const { memo, attachedObject, attachedObjectType, isLoading, error } = useMemoEditorData(memoEventData);
  const isReady = !isLoading && !error && !!attachedObject && !!attachedObjectType;

  return (
    <Dialog
      open={isMemoDialogOpen && memoEventData !== undefined}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMaximized}
      slotProps={{
        paper: {
          sx: {
            height: isMaximized ? "100%" : "calc(100% - 64px)",
          },
        },
      }}
    >
      {isReady && memoEventData ? (
        <MemoDialogEditor
          key={memo?.id ?? "new"}
          memo={memo}
          attachedObject={attachedObject}
          attachedObjectType={attachedObjectType}
          memoEventData={memoEventData}
          onClose={handleClose}
          isMaximized={isMaximized}
          onToggleMaximize={toggleMaximize}
        />
      ) : (
        <>
          <DATSDialogHeader
            title="Memo Editor"
            onClose={handleClose}
            isMaximized={isMaximized}
            onToggleMaximize={toggleMaximize}
          />
          {isLoading && (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          )}
          {error && (
            <DialogContent>
              <Typography color="error">Error: {error.message}</Typography>
            </DialogContent>
          )}
        </>
      )}
    </Dialog>
  );
}

interface MemoDialogEditorProps {
  memo: MemoRead | undefined;
  attachedObject: MemoAttachedObject;
  attachedObjectType: AttachedObjectType;
  memoEventData: MemoDialogEvent;
  onClose: () => void;
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

/**
 * Owns the (single) persistence instance for the dialog and renders the
 * header (with the action menu) plus the MemoEditor.
 */
function MemoDialogEditor({
  memo,
  attachedObject,
  attachedObjectType,
  memoEventData,
  onClose,
  isMaximized,
  onToggleMaximize,
}: MemoDialogEditorProps) {
  const { formData, handleTitleChange, handleContentChange, handleIconChange, discardPendingChanges } =
    useMemoPersistence({
      memo,
      attachedObject,
      attachedObjectType,
      onMemoCreateSuccess: memoEventData.onCreateSuccess,
    });

  const handleDelete = useCallback(() => {
    discardPendingChanges();
    onClose();
  }, [discardPendingChanges, onClose]);

  return (
    <>
      <DATSDialogHeader
        title="Memo Editor"
        onClose={onClose}
        isMaximized={isMaximized}
        onToggleMaximize={onToggleMaximize}
        endActions={
          <MemoActionMenu
            memo={memo}
            onDeleteClick={handleDelete}
            iconButtonProps={{ color: "inherit", size: "small" }}
          />
        }
      />
      <DialogContent sx={{ p: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <MemoEditor
          memo={memo}
          attachedObject={attachedObject}
          attachedObjectType={attachedObjectType}
          formData={formData}
          onTitleChange={handleTitleChange}
          onContentChange={handleContentChange}
          onIconChange={handleIconChange}
        />
      </DialogContent>
    </>
  );
}
