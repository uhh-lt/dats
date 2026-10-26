import { DATSDialogHeader } from "@components/DATSDialogHeader";
import { useDialogMaximize } from "@hooks/useDialogMaximize";
import { AttachedObjectType } from "@models/AttachedObjectType";
import { MemoRead } from "@models/MemoRead";
import { Box, CircularProgress, Dialog, DialogContent, Typography } from "@mui/material";
import { useDialogBus } from "@store/global/dialogBusHooks";
import { useCallback } from "react";
import { MemoActionMenu } from "../MemoActionMenu";
import { MemoAttachedObject, MemoEditor, useMemoEditorData, useMemoPersistence } from "../editor";
import { closeOnEscape } from "@utils/dialogUtils";

/**
 * Global memo dialog container: dialog bus open state + dialog chrome
 * (header, maximize, actions). The editing experience lives in MemoEditor,
 * data in useMemoEditorData, persistence in useMemoPersistence.
 */
export function MemoDialog() {
  const { isOpen, data: dialogData, close: handleClose, onSuccess } = useDialogBus("memo");

  // maximize
  const { isMaximized, toggleMaximize } = useDialogMaximize();

  // data
  const { memo, attachedObject, attachedObjectType, isLoading, error } = useMemoEditorData(dialogData);
  const isReady = !isLoading && !error && !!attachedObject && !!attachedObjectType;

  return (
    <Dialog
      open={isOpen && dialogData !== undefined}
      onClose={closeOnEscape(handleClose)}
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
      {isReady ? (
        <MemoDialogEditor
          key={memo?.id ?? "new"}
          memo={memo}
          attachedObject={attachedObject}
          attachedObjectType={attachedObjectType}
          onMemoCreateSuccess={onSuccess}
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
  onMemoCreateSuccess: (memo: MemoRead) => void;
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
  onMemoCreateSuccess,
  onClose,
  isMaximized,
  onToggleMaximize,
}: MemoDialogEditorProps) {
  const { formData, handleTitleChange, handleContentChange, handleIconChange, discardPendingChanges } =
    useMemoPersistence({
      memo,
      attachedObject,
      attachedObjectType,
      onMemoCreateSuccess,
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
