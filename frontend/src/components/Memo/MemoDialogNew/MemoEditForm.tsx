import SaveIcon from "@mui/icons-material/Save";
import { DialogContent, Divider, IconButton, Toolbar, Typography } from "@mui/material";
import { memo, useCallback, useMemo, useState } from "react";
import { SubmitHandler } from "react-hook-form";
import MemoHooks from "../../../api/MemoHooks.ts";
import { MemoRead } from "../../../api/openapi/models/MemoRead.ts";
import { useAuth } from "../../../auth/useAuth.ts";
import { dateToLocaleString } from "../../../utils/DateUtils.ts";
import EditableTypography from "../../EditableTypography.tsx";
import MemoActionsMenu from "../MemoActionsMenu.tsx";
import MemoBlockEditorView from "../MemoBlockEditorView.tsx";

export interface MemoFormValues {
  title: string;
  content: string;
  content_json: string;
}

interface MemoDialogFormProps {
  handleUpdateMemo: SubmitHandler<MemoFormValues>;
  onDeleteClick: () => void;
}

function MemoEditForm({ memoId, ...props }: MemoDialogFormProps & { memoId: number }) {
  const memo = MemoHooks.useGetMemo(memoId);

  if (memo.data) return <MemoEditFormContent memo={memo.data} {...props} />;
  return null;
}
function MemoEditFormContent({ memo, handleUpdateMemo, onDeleteClick }: MemoDialogFormProps & { memo: MemoRead }) {
  // global client state
  const { user } = useAuth();

  // local state
  const [formData, setFormData] = useState<MemoFormValues>({
    title: memo.title,
    content: memo.content,
    content_json: memo.content_json,
  });

  const isEditable = useMemo(() => user?.id === memo.user_id, [memo, user?.id]);

  const lastModifiedDate = useMemo(() => {
    const fullDate = dateToLocaleString(memo.updated);
    return fullDate.substring(0, fullDate.indexOf(","));
  }, [memo.updated]);

  const handleTitleChange = useCallback((title: string) => {
    setFormData((oldFormData) => ({
      ...oldFormData,
      title,
    }));
  }, []);

  const handleContentChange = useCallback((content: string, contentJson: string) => {
    setFormData((oldFormData) => ({
      ...oldFormData,
      content,
      content_json: contentJson,
    }));
  }, []);

  const handleSave = useCallback(() => {
    handleUpdateMemo(formData);
  }, [handleUpdateMemo, formData]);

  if (!user) return null;

  return (
    <DialogContent className="h100 myFlexContainer" sx={{ p: 0 }}>
      <Toolbar disableGutters variant="dense" sx={{ justifyContent: "space-between" }}>
        <IconButton onClick={handleSave} color="success">
          <SaveIcon />
        </IconButton>
        {isEditable ? (
          <EditableTypography variant="h6" value={formData.title} onChange={handleTitleChange} whiteColor={false} />
        ) : (
          <Typography variant="h6">{formData.title}</Typography>
        )}
        <MemoActionsMenu memo={memo} onDeleteClick={onDeleteClick} />
      </Toolbar>
      <Divider />
      <MemoBlockEditorView
        initialContentJson={memo.content_json}
        onChange={handleContentChange}
        editable={isEditable}
        debounce={500}
      />
      <Typography variant="subtitle2" color="textSecondary" fontSize={12} p={1}>
        {"Last modified: " + lastModifiedDate}
      </Typography>
    </DialogContent>
  );
}

export default memo(MemoEditForm);
