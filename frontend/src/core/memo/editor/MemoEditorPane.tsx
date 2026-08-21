import { AttachedObjectType } from "@models/AttachedObjectType";
import { MemoRead } from "@models/MemoRead";
import { Box, CircularProgress, Divider, Toolbar, Typography } from "@mui/material";
import { memo, ReactNode, useCallback } from "react";
import { MemoActionMenu } from "../MemoActionMenu";
import { MemoEditor } from "./MemoEditor";
import { MemoAttachedObject, useMemoEditorData } from "./hooks/useMemoEditorData";
import { useMemoPersistence } from "./hooks/useMemoPersistence";

interface MemoEditorPaneProps {
  memoId: number;
  renderToolbar?: (memo: MemoRead) => ReactNode;
  onDelete?: () => void;
}

/**
 * Embedded memo editor container: toolbar with actions + the MemoEditor.
 * Data fetching lives in useMemoEditorData, persistence in useMemoPersistence.
 * The displayed memo always comes from the React Query cache (mutations keep it fresh).
 */
export const MemoEditorPane = memo(({ memoId, renderToolbar, onDelete }: MemoEditorPaneProps) => {
  const { memo, attachedObject, attachedObjectType, isLoading, error } = useMemoEditorData({ memoId });

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" pt={2}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Typography color="error">Error: {error.message}</Typography>;
  }

  if (!memo || !attachedObject || !attachedObjectType) {
    return null;
  }

  return (
    <MemoEditorPaneContent
      memo={memo}
      attachedObject={attachedObject}
      attachedObjectType={attachedObjectType}
      renderToolbar={renderToolbar}
      onDelete={onDelete}
    />
  );
});

interface MemoEditorPaneContentProps {
  memo: MemoRead;
  attachedObject: MemoAttachedObject;
  attachedObjectType: AttachedObjectType;
  renderToolbar?: (memo: MemoRead) => ReactNode;
  onDelete?: () => void;
}

function MemoEditorPaneContent({
  memo,
  attachedObject,
  attachedObjectType,
  renderToolbar,
  onDelete,
}: MemoEditorPaneContentProps) {
  const { formData, handleTitleChange, handleContentChange, handleIconChange, discardPendingChanges } =
    useMemoPersistence({
      memo,
      attachedObject,
      attachedObjectType,
    });

  const handleDelete = useCallback(() => {
    discardPendingChanges();
    onDelete?.();
  }, [discardPendingChanges, onDelete]);

  return (
    <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Toolbar variant="dense" disableGutters sx={{ flexShrink: 0, px: 0.5 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>{renderToolbar?.(memo)}</Box>
        <MemoActionMenu memo={memo} onDeleteClick={handleDelete} />
      </Toolbar>
      <Divider />
      <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
        <MemoEditor
          key={memo.id}
          memo={memo}
          attachedObject={attachedObject}
          attachedObjectType={attachedObjectType}
          formData={formData}
          onTitleChange={handleTitleChange}
          onContentChange={handleContentChange}
          onIconChange={handleIconChange}
        />
      </Box>
    </Box>
  );
}
